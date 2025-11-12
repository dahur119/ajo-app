using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using investment_service.Dtos;
using investment_service.Models;
using investment_service.Data;

namespace investment_service.Tests
{
    public class TransactionsControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public TransactionsControllerIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<Subscription> CreateActiveSubscriptionAsync()
        {
            var productDto = new CreateProductDto
            {
                Name = "Txn Product",
                RateApr = 0.05m,
                Compounding = "none",
                MinContribution = 1000,
                Currency = "NGN"
            };
            var prodResp = await _client.PostAsJsonAsync("/products", productDto);
            prodResp.EnsureSuccessStatusCode();
            var product = await prodResp.Content.ReadFromJsonAsync<Product>();

            var createSubDto = new CreateSubscriptionDto { ProductId = product!.Id, Currency = "NGN" };
            var subResp = await _client.PostAsJsonAsync("/subscriptions", createSubDto);
            subResp.EnsureSuccessStatusCode();
            var sub = await subResp.Content.ReadFromJsonAsync<Subscription>();
            return sub!;
        }

        [Fact]
        public async Task List_Transactions_For_Subscription_ReturnsOk()
        {
            var sub = await CreateActiveSubscriptionAsync();
            var listResp = await _client.GetAsync($"/subscriptions/{sub.Id}/transactions");
            Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
            var items = await listResp.Content.ReadFromJsonAsync<InvestmentTransaction[]>();
            Assert.NotNull(items);
            Assert.True(items!.Length == 0);
        }

        [Fact]
        public async Task Contribute_ValidAmount_ReturnsAccepted_Pending()
        {
            var sub = await CreateActiveSubscriptionAsync();

            var contrib = new ContributionDto { Amount = 1500m, Currency = "NGN" };
            var resp = await _client.PostAsJsonAsync($"/subscriptions/{sub.Id}/contributions", contrib);
            Assert.Equal(HttpStatusCode.Accepted, resp.StatusCode);

            var payload = await resp.Content.ReadFromJsonAsync<dynamic>();
            Assert.NotNull(payload);

            var listResp = await _client.GetAsync($"/subscriptions/{sub.Id}/transactions");
            var items = await listResp.Content.ReadFromJsonAsync<InvestmentTransaction[]>();
            Assert.NotNull(items);
            Assert.Single(items!);
            Assert.Equal("contribution", items![0].Type);
            Assert.Equal("pending", items![0].Status);
        }

        [Fact]
        public async Task Withdraw_Invalid_Amount_ReturnsBadRequest()
        {
            var sub = await CreateActiveSubscriptionAsync();
            var withdrawDto = new WithdrawalDto { Amount = 500m, Currency = "NGN" };
            var resp = await _client.PostAsJsonAsync($"/subscriptions/{sub.Id}/withdrawals", withdrawDto);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        }

        [Fact]
        public async Task Withdraw_Valid_Amount_ReturnsAccepted_AndUpdatesPrincipal()
        {
            var sub = await CreateActiveSubscriptionAsync();

            // Seed principal via EF context since contribution remains pending without external transfer
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<InvestmentDbContext>();
                var tracked = await db.Subscriptions.FindAsync(sub.Id);
                tracked!.BalancePrincipal = 2000m;
                await db.SaveChangesAsync();
            }

            var withdrawDto = new WithdrawalDto { Amount = 500m, Currency = "NGN" };
            var resp = await _client.PostAsJsonAsync($"/subscriptions/{sub.Id}/withdrawals", withdrawDto);
            Assert.Equal(HttpStatusCode.Accepted, resp.StatusCode);

            // Verify principal decreased
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<InvestmentDbContext>();
                var tracked = await db.Subscriptions.FindAsync(sub.Id);
                Assert.Equal(1500m, tracked!.BalancePrincipal);
            }
        }
    }
}