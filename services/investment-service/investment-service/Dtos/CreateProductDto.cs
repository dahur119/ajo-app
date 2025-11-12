namespace investment_service.Dtos
{
    public class CreateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal RateApr { get; set; }
        public string Compounding { get; set; } = "none";
        public decimal MinContribution { get; set; }
        public string Currency { get; set; } = "NGN";
    }
}