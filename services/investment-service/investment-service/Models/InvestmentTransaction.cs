using System;

namespace investment_service.Models
{
    public class InvestmentTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SubscriptionId { get; set; }
        public string Type { get; set; } = "contribution"; // contribution|withdrawal|accrual|payout
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "NGN";
        public string RequestId { get; set; } = string.Empty; // unique idempotency key
        public string Status { get; set; } = "pending"; // pending|posted|failed
        public string? Meta { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}