using Microsoft.AspNetCore.Mvc;
using investment_service.Data;
using investment_service.Models;
using investment_service.Dtos;
using Microsoft.AspNetCore.Authorization;

namespace investment_service.Controllers
{
    [ApiController]
    [Route("products")]
    public class ProductsController : ControllerBase
    {
        private readonly InvestmentDbContext _db;
        public ProductsController(InvestmentDbContext db) { _db = db; }

        [HttpGet]
        public IActionResult List()
        {
            try
            {
                return Ok(_db.Products.ToList());
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, "An error occurred while fetching products.");
            }
        }

        [HttpGet("{id}")]
        public IActionResult Get(Guid id)
        {
            var p = _db.Products.Find(id);
            return p is null ? NotFound() : Ok(p);
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateProductDto dto)
        {
            var p = new Product
            {
                Name = dto.Name,
                RateApr = dto.RateApr,
                Compounding = dto.Compounding,
                MinContribution = dto.MinContribution,
                Currency = dto.Currency,
                Active = true
            };
            _db.Products.Add(p);
            _db.SaveChanges();
            return Created($"/products/{p.Id}", p);
        }

        [HttpPut("{id}")]

        public IActionResult Update(Guid id, [FromBody] UpdateProductDto dto)
        {
            var p = _db.Products.Find(id);
            if (p is null) return NotFound();

            // Update all fields from DTO (full replacement semantics)
            p.Name = dto.Name;
            p.RateApr = dto.RateApr;
            p.Compounding = dto.Compounding;
            p.MinContribution = dto.MinContribution;
            p.Currency = dto.Currency;
            p.Active = dto.Active;

            _db.SaveChanges();
            return Ok(p);
        }

        [HttpDelete("{id}")]

        public IActionResult Delete(Guid id)
        {
            var p = _db.Products.Find(id);
            if (p is null) return NotFound();

            // Soft delete: mark as inactive so existing subscriptions aren’t broken
            if (p.Active)
            {
                p.Active = false;
                _db.SaveChanges();
            }

            return NoContent();
        }
    }
}