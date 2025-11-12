namespace investment_service.Dtos
{
    public class ContributionDto
    {
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "NGN";
    }
}