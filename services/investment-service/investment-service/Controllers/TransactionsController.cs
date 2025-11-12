using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using investment_service.Data;
using investment_service.Models;
using investment_service.Dtos;
 

namespace investment_service.Controllers
{
    [ApiController]
    [Route("subscriptions/{id}")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly InvestmentDbContext _db;
        private readonly IHttpClientFactory _http;
        private readonly IConfiguration _config;

        public TransactionsController(InvestmentDbContext db, IHttpClientFactory http, IConfiguration config)
        {
            _db = db; _http = http; _config = config;
        }

        [HttpGet("transactions")]
        public IActionResult List(Guid id)
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            var sub = _db.Subscriptions.Find(id);
            if (sub is null) return NotFound();
            if (sub.UserId != userId) return Forbid();
            var items = _db.InvestmentTransactions.Where(t => t.SubscriptionId == id).OrderByDescending(t => t.CreatedAt).ToList();
            return Ok(items);
        }

        [HttpPost("contributions")]
        public async Task<IActionResult> Contribute(Guid id, [FromBody] ContributionDto dto)
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            var sub = _db.Subscriptions.Find(id);
            if (sub is null) return NotFound();
            if (sub.UserId != userId) return Forbid();

            var product = _db.Products.Find(sub.ProductId);
            if (product is null || !product.Active) return BadRequest(new { error = "invalid_product" });
            if (dto.Amount < product.MinContribution) return BadRequest(new { error = "amount_below_min" });

            var requestId = $"inv:{id}:contrib:{DateTime.UtcNow:yyyy-MM-dd}:{Guid.NewGuid():N}";
            var tx = new InvestmentTransaction
            {
                SubscriptionId = id,
                Type = "contribution",
                Amount = dto.Amount,
                Currency = dto.Currency,
                RequestId = requestId,
                Status = "pending"
            };
            _db.InvestmentTransactions.Add(tx);
            _db.SaveChanges();

            // Optional: call transaction-service transfers if configured
            var baseUrl = _config["TRANSACTION_BASE_URL"] ?? "";
            if (!string.IsNullOrWhiteSpace(baseUrl))
            {
                try
                {
                    var client = _http.CreateClient();
                    var payload = new
                    {
                        requestId,
                        fromAccountId = $"user:{userId}:{dto.Currency}",
                        toAccountId = $"product:{product.Id}:{dto.Currency}",
                        amount = dto.Amount.ToString(),
                        currency = dto.Currency
                    };
                    var resp = await client.PostAsJsonAsync($"{baseUrl}/transfers", payload);
                    if (resp.IsSuccessStatusCode)
                    {
                        tx.Status = "posted";
                    }
                    else
                    {
                        tx.Status = "failed";
                        tx.Meta = await resp.Content.ReadAsStringAsync();
                    }
                    _db.SaveChanges();
                }
                catch (Exception ex)
                {
                    tx.Status = "failed";
                    tx.Meta = ex.Message;
                    _db.SaveChanges();
                }
            }

            // Update principal if posted
            if (tx.Status == "posted")
            {
                sub.BalancePrincipal += dto.Amount;
                _db.SaveChanges();
            }

            return Accepted(new { transactionId = tx.Id, status = tx.Status });
        }

        [HttpPost("withdrawals")]
        public IActionResult Withdraw(Guid id, [FromBody] WithdrawalDto dto)
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            var sub = _db.Subscriptions.Find(id);
            if (sub is null) return NotFound();
            if (sub.UserId != userId) return Forbid();
            if (dto.Amount <= 0 || dto.Amount > sub.BalancePrincipal) return BadRequest(new { error = "invalid_amount" });

            var requestId = $"inv:{id}:withdraw:{DateTime.UtcNow:yyyy-MM-dd}:{Guid.NewGuid():N}";
            var tx = new InvestmentTransaction
            {
                SubscriptionId = id,
                Type = "withdrawal",
                Amount = dto.Amount,
                Currency = dto.Currency,
                RequestId = requestId,
                Status = "pending"
            };
            _db.InvestmentTransactions.Add(tx);
            _db.SaveChanges();

            // For MVP, mark posted and update principal instantly
            tx.Status = "posted";
            _db.SaveChanges();

            sub.BalancePrincipal -= dto.Amount;
            _db.SaveChanges();

            return Accepted(new { transactionId = tx.Id, status = tx.Status });
        }

        private bool TryResolveUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var uid = User.FindFirst("sub")?.Value
                      ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(uid) && Guid.TryParse(uid, out var fromJwt))
            {
                userId = fromJwt;
                return true;
            }
            return false;
        }
    }
}