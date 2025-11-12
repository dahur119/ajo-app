using System;

namespace investment_service.Models
{
    public class Subscription
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid ProductId { get; set; }
        public string Status { get; set; } = "active"; // active|paused|closed
        public decimal BalancePrincipal { get; set; } = 0m;
        public decimal BalanceInterest { get; set; } = 0m;
        public string Currency { get; set; } = "NGN";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}