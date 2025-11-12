using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace investment_service.Security
{
    public class GatewaySignatureOptions
    {
        public string Secret { get; set; } = "local-gateway-secret";
        public string SignatureHeader { get; set; } = "x-gw-sig";
        public string TimestampHeader { get; set; } = "x-gw-ts";
        public string NonceHeader { get; set; } = "x-gw-nonce";
        public string UserIdHeader { get; set; } = "x-user-id";
        public int MaxSkewSeconds { get; set; } = 300;
    }

    public class GatewaySignatureVerifier : IGatewaySignatureVerifier
    {
        private readonly IMemoryCache _cache;
        private readonly GatewaySignatureOptions _opts;

        public GatewaySignatureVerifier(IMemoryCache cache, IOptions<GatewaySignatureOptions> options)
        {
            _cache = cache;
            _opts = options.Value;
        }

        public bool TryGetUserIdFromSignedHeaders(HttpRequest request, out Guid userId)
        {
            userId = Guid.Empty;

            var uidRaw = request.Headers[_opts.UserIdHeader].FirstOrDefault();
            var sig = request.Headers[_opts.SignatureHeader].FirstOrDefault();
            var tsRaw = request.Headers[_opts.TimestampHeader].FirstOrDefault();
            var nonce = request.Headers[_opts.NonceHeader].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(uidRaw) || string.IsNullOrWhiteSpace(sig) || string.IsNullOrWhiteSpace(tsRaw) || string.IsNullOrWhiteSpace(nonce))
                return false;
            if (!Guid.TryParse(uidRaw, out var uid)) return false;

            // Parse timestamp as epoch seconds; fallback to ISO-8601
            long ts;
            if (!long.TryParse(tsRaw, out ts))
            {
                if (DateTimeOffset.TryParse(tsRaw, out var dto))
                {
                    ts = dto.ToUnixTimeSeconds();
                }
                else
                {
                    return false;
                }
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (Math.Abs(now - ts) > _opts.MaxSkewSeconds) return false;

            // Replay protection
            var cacheKey = $"gw-nonce:{uid}:{nonce}";
            if (_cache.TryGetValue(cacheKey, out _)) return false;

            // Compute HMAC over canonical string: METHOD|PATH|userId|timestamp|nonce
            var method = request.Method?.ToUpperInvariant() ?? "GET";
            var path = request.Path.Value ?? "/";
            var canonical = $"{method}|{path}|{uid:N}|{ts}|{nonce}";
            var computed = ComputeHmac(_opts.Secret, canonical);

            if (!ConstantTimeEquals(computed.Hex, sig) && !ConstantTimeEquals(computed.Base64, sig))
                return false;

            // Mark nonce as used
            _cache.Set(cacheKey, true, TimeSpan.FromSeconds(_opts.MaxSkewSeconds));

            userId = uid;
            return true;
        }

        private static (string Hex, string Base64) ComputeHmac(string secret, string data)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var bytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            var hex = Convert.ToHexString(bytes).ToLowerInvariant();
            var b64 = Convert.ToBase64String(bytes);
            return (hex, b64);
        }

        private static bool ConstantTimeEquals(string a, string b)
        {
            if (a is null || b is null) return false;
            var aBytes = Encoding.UTF8.GetBytes(a);
            var bBytes = Encoding.UTF8.GetBytes(b);
            if (aBytes.Length != bBytes.Length) return false;
            int diff = 0;
            for (int i = 0; i < aBytes.Length; i++) diff |= aBytes[i] ^ bBytes[i];
            return diff == 0;
        }
    }
}