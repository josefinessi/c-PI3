# ---------- BUILD ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copia o .csproj primeiro (melhora cache)
COPY GestaoFerias.API/GestaoFerias.API.csproj GestaoFerias.API/
COPY GestaoFerias.Application/GestaoFerias.Application.csproj GestaoFerias.Application/
COPY GestaoFerias.Domain/GestaoFerias.Domain.csproj GestaoFerias.Domain/
COPY GestaoFerias.Infrastructure/GestaoFerias.Infrastructure.csproj GestaoFerias.Infrastructure/

# Restaura dependências
RUN dotnet restore GestaoFerias.API/GestaoFerias.API.csproj

# Copia o resto do código
COPY . .

# Publica
RUN dotnet publish GestaoFerias.API/GestaoFerias.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---------- RUNTIME ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Render define PORT, então a API precisa escutar nela
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# (Opcional) força Production por padrão
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish ./

# Render injeta PORT em runtime; EXPOSE é mais “documentação”, mas ajuda
EXPOSE 8080

ENTRYPOINT ["dotnet", "GestaoFerias.API.dll"]