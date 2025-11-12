using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using investment_service.Dtos;
using investment_service.Models;

namespace investment_service.Tests
{
    public class ProductsControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ProductsControllerIntegrationTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Get_Products_ReturnsOk()
        {
            var response = await _client.GetAsync("/products");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var products = await response.Content.ReadFromJsonAsync<Product[]>();
            Assert.NotNull(products);
        }

        [Fact]
        public async Task Post_Products_CreatesProduct_ThenListShowsIt()
        {
            var dto = new CreateProductDto
            {
                Name = "Integration Ajo",
                RateApr = 0.07m,
                Compounding = "none",
                MinContribution = 1500,
                Currency = "NGN"
            };

            var createResponse = await _client.PostAsJsonAsync("/products", dto);
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            var created = await createResponse.Content.ReadFromJsonAsync<Product>();
            Assert.NotNull(created);
            Assert.Equal("Integration Ajo", created!.Name);
            Assert.True(created.Active);

            var listResponse = await _client.GetAsync("/products");
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
            var products = await listResponse.Content.ReadFromJsonAsync<Product[]>();
            Assert.NotNull(products);
            Assert.Contains(products!, p => p.Name == "Integration Ajo");
        }
    }
}