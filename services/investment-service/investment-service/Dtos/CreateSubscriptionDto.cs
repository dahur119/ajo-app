using System;

namespace investment_service.Dtos
{
    public class CreateSubscriptionDto
    {
        public Guid ProductId { get; set; }
        public string Currency { get; set; } = "NGN";
    }
}