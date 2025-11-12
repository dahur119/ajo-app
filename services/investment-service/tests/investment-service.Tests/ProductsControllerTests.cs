using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using investment_service.Controllers;
using investment_service.Data;
using investment_service.Dtos;
using investment_service.Models;

namespace investment_service.Tests
{
    public class ProductsControllerTests
    {
        private InvestmentDbContext CreateDb()
        {
            var options = new DbContextOptionsBuilder<InvestmentDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new InvestmentDbContext(options);
        }

        [Fact]
        public void Create_AddsProduct_AndReturnsCreated()
        {
            var db = CreateDb();
            var controller = new ProductsController(db);
            var dto = new CreateProductDto
            {
                Name = "Test Product",
                RateApr = 0.05m,
                Compounding = "none",
                MinContribution = 1000,
                Currency = "NGN"
            };

            var result = controller.Create(dto) as CreatedResult;
            Assert.NotNull(result);
            Assert.Equal(201, result.StatusCode);
            var created = Assert.IsType<Product>(result.Value);
            Assert.Equal("Test Product", created.Name);
            Assert.True(created.Active);
            Assert.Equal(1, db.Products.Count());
        }

        [Fact]
        public void List_ReturnsOk_WithProducts()
        {
            var db = CreateDb();
            db.Products.Add(new Product
            {
                Name = "P1",
                RateApr = 0.03m,
                Compounding = "none",
                MinContribution = 500,
                Currency = "NGN",
                Active = true
            });
            db.SaveChanges();

            var controller = new ProductsController(db);
            var result = controller.List() as OkObjectResult;
            Assert.NotNull(result);
            var list = Assert.IsAssignableFrom<IEnumerable<Product>>(result.Value);
            Assert.Single(list);
        }

        [Fact]
        public void Get_UnknownId_ReturnsNotFound()
        {
            var db = CreateDb();
            var controller = new ProductsController(db);
            var result = controller.Get(Guid.NewGuid());
            Assert.IsType<NotFoundResult>(result);
        }
    }
}