using Microsoft.AspNetCore.Http;

namespace investment_service.Security
{
    public interface IGatewaySignatureVerifier
    {
        bool TryGetUserIdFromSignedHeaders(HttpRequest request, out Guid userId);
    }
}