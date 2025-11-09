FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY investment-service/investment-service.csproj ./
RUN dotnet restore
COPY . .
WORKDIR /src/investment-service
RUN dotnet build -c Release -o /app/build

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/build .
EXPOSE 5000
ENTRYPOINT ["dotnet", "investment-service.dll"]