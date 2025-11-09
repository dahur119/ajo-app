# Investment Service

.NET Core service responsible for handling investment operations and calculations.

## Prerequisites

- .NET SDK 6.0+

## Setup & Run

```bash
cd services/investment-service/investment-service
dotnet restore
dotnet build
dotnet run
```

The service runs on port 5000 by default (configured in Docker Compose).

## Testing

```bash
cd services/investment-service/investment-service
dotnet test
```

## Docker

Build and run via Docker Compose:

```bash
docker-compose up --build investment-service
```

## Configuration

No additional environment variables are required beyond those in `docker-compose.yml`.

## Contributing

Contributions are welcome. Please open issues or submit pull requests.