namespace investment_service.Dtos
{
    public class UpdateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal RateApr { get; set; }
        public string Compounding { get; set; } = "none"; // e.g., none, daily, monthly
        public decimal MinContribution { get; set; }
        public string Currency { get; set; } = "NGN";
        public bool Active { get; set; } = true;
    }
}