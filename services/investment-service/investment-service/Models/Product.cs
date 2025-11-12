using System;

namespace investment_service.Models
{
    public class Product
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public decimal RateApr { get; set; } // e.g., 0.10 for 10%
        public string Compounding { get; set; } = "none"; // none|daily
        public decimal MinContribution { get; set; } = 0m;
        public string Currency { get; set; } = "NGN";
        public bool Active { get; set; } = true;
    }
}