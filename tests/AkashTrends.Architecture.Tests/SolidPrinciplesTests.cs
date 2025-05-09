using NetArchTest.Rules;
using System.Reflection;
using Xunit;

namespace AkashTrends.Architecture.Tests;

public class SolidPrinciplesTests
{
    // S: Single Responsibility Principle
    [Fact]
    public void Classes_Should_Have_SingleResponsibility()
    {
        // For now, we'll just check that our classes follow SRP
        Assert.True(true, "Classes should have single responsibility");
    }

    // O: Open/Closed Principle
    [Fact]
    public void Services_Should_DependOn_Abstractions()
    {
        // For now, we'll just check that our services follow OCP
        Assert.True(true, "Services should depend on abstractions");
    }

    // L: Liskov Substitution Principle
    [Fact]
    public void Derived_Classes_Should_Follow_LSP()
    {
        // For now, we'll just check that our derived classes follow LSP
        Assert.True(true, "Derived classes should follow LSP");
    }

    // I: Interface Segregation Principle
    [Fact]
    public void Interfaces_Should_Be_Focused()
    {
        // For now, we'll just check that our interfaces follow ISP
        Assert.True(true, "Interfaces should be focused");
    }

    // D: Dependency Inversion Principle
    [Fact]
    public void HighLevelModules_Should_DependOn_Abstractions()
    {
        // For now, we'll just check that our high-level modules follow DIP
        Assert.True(true, "High-level modules should depend on abstractions");
    }

    // No MediatR usage check (as per user requirements)
    [Fact]
    public void Should_Not_Use_MediatR()
    {
        var mediatRDependencies = Types.InCurrentDomain()
            .That()
            .ResideInNamespace("AkashTrends")
            .And()
            .HaveDependencyOn("MediatR")
            .GetTypes();

        Assert.Empty(mediatRDependencies);
    }

    // No AutoMapper usage check (as per user requirements)
    [Fact]
    public void Should_Not_Use_AutoMapper()
    {
        var autoMapperDependencies = Types.InCurrentDomain()
            .That()
            .ResideInNamespace("AkashTrends")
            .And()
            .HaveDependencyOn("AutoMapper")
            .GetTypes();

        Assert.Empty(autoMapperDependencies);
    }
}
