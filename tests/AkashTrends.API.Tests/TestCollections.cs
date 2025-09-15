using AkashTrends.API;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AkashTrends.API.Tests;

[CollectionDefinition("WebApplication Collection")]
public class WebApplicationCollection : ICollectionFixture<WebApplicationFactory<Program>>
{
}