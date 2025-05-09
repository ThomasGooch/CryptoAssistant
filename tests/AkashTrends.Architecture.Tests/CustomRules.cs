using NetArchTest.Rules;
using System.Reflection;
using Mono.Cecil;

namespace AkashTrends.Architecture.Tests;

public class InterfaceMethodCountRule : ICustomRule
{
    private readonly int _maxMethodCount;

    public InterfaceMethodCountRule(int maxMethodCount)
    {
        _maxMethodCount = maxMethodCount;
    }

    public bool MeetsRule(TypeDefinition type)
    {
        var methodCount = type.Methods.Count;
        return methodCount <= _maxMethodCount;
    }
}

public class ClassMethodCountRule : ICustomRule
{
    private readonly int _maxMethodCount;

    public ClassMethodCountRule(int maxMethodCount)
    {
        _maxMethodCount = maxMethodCount;
    }

    public bool MeetsRule(TypeDefinition type)
    {
        var methodCount = type.Methods.Count(m => m.IsPublic && !m.IsStatic);
        return methodCount <= _maxMethodCount;
    }
}
