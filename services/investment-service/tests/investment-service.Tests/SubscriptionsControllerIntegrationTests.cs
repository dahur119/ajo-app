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
    public class SubscriptionsControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public SubscriptionsControllerIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<Guid> EnsureProductAsync()
        {
            var dto = new CreateProductDto
            {
                Name = "Sub Product",
                RateApr = 0.04m,
                Compounding = "none",
                MinContribution = 1000,
                Currency = "NGN"
            };
            var resp = await _client.PostAsJsonAsync("/products", dto);
            resp.EnsureSuccessStatusCode();
            var p = await resp.Content.ReadFromJsonAsync<Product>();
            return p!.Id;
        }

        [Fact]
        public async Task Create_And_List_Subscriptions_Work()
        {
            var productId = await EnsureProductAsync();
            var createDto = new CreateSubscriptionDto { ProductId = productId, Currency = "NGN" };

            var createResp = await _client.PostAsJsonAsync("/subscriptions", createDto);
            Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
            var created = await createResp.Content.ReadFromJsonAsync<Subscription>();
            Assert.NotNull(created);
            Assert.Equal("active", created!.Status);

            var listResp = await _client.GetAsync("/subscriptions");
            Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
            var list = await listResp.Content.ReadFromJsonAsync<Subscription[]>();
            Assert.NotNull(list);
            Assert.Contains(list!, s => s.Id == created.Id);
        }

        [Fact]
        public async Task Get_Subscription_By_Id_ReturnsOk()
        {
            var productId = await EnsureProductAsync();
            var createDto = new CreateSubscriptionDto { ProductId = productId, Currency = "NGN" };
            var createResp = await _client.PostAsJsonAsync("/subscriptions", createDto);
            var created = await createResp.Content.ReadFromJsonAsync<Subscription>();

            var getResp = await _client.GetAsync($"/subscriptions/{created!.Id}");
            Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
            var sub = await getResp.Content.ReadFromJsonAsync<Subscription>();
            Assert.NotNull(sub);
            Assert.Equal(created.Id, sub!.Id);
        }
    }
}