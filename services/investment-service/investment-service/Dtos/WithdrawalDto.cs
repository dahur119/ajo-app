namespace investment_service.Dtos
{
    public class WithdrawalDto
    {
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "NGN";
    }
}