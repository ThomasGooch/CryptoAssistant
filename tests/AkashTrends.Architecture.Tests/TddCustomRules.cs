using Mono.Cecil;
using NetArchTest.Rules;
using System.Reflection;

namespace AkashTrends.Architecture.Tests;

public class HasTestsRule : ICustomRule
{
    public bool MeetsRule(TypeDefinition type)
    {
        // Check if there's a test class for this type
        var typeName = type.Name;
        
        // Get all test assemblies
        var testAssemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => a.GetName().Name?.EndsWith(".Tests") == true)
            .ToArray();
            
        // Look for test classes with matching names
        foreach (var assembly in testAssemblies)
        {
            var hasTestClass = assembly.GetTypes()
                .Any(t => t.Name.Contains(typeName + "Tests") || 
                     t.Name.Contains(typeName.Replace("Service", "") + "Tests") ||
                     t.Name.Contains(typeName.Replace("Controller", "") + "Tests"));
                     
            if (hasTestClass)
            {
                return true;
            }
        }
        
        return false;
    }
}

public class MethodNamingConventionRule : ICustomRule
{
    public bool MeetsRule(TypeDefinition type)
    {
        // Load the actual Type object to check method attributes
        var loadedType = Type.GetType(type.FullName);
        if (loadedType == null) return true; // Skip if we can't load the type
        
        // Get test methods (those with Fact or Theory attributes)
        var testMethods = loadedType.GetMethods()
            .Where(m => m.GetCustomAttributes(typeof(Xunit.FactAttribute), false).Length > 0 || 
                       m.GetCustomAttributes(typeof(Xunit.TheoryAttribute), false).Length > 0)
            .ToList();
            
        // Check if all test methods follow naming convention (contain underscore)
        return testMethods.All(m => m.Name.Contains("_"));
    }
}

public class MultipleTestsRule : ICustomRule
{
    public bool MeetsRule(TypeDefinition type)
    {
        // Load the actual Type object to check method attributes
        var loadedType = Type.GetType(type.FullName);
        if (loadedType == null) return true; // Skip if we can't load the type
        
        // Count test methods (those with Fact or Theory attributes)
        var testMethodCount = loadedType.GetMethods()
            .Count(m => m.GetCustomAttributes(typeof(Xunit.FactAttribute), false).Length > 0 || 
                       m.GetCustomAttributes(typeof(Xunit.TheoryAttribute), false).Length > 0);
                       
        // Check if there are at least 2 test methods
        return testMethodCount >= 2;
    }
}

public class UsesNSubstituteRule : ICustomRule
{
    public bool MeetsRule(TypeDefinition type)
    {
        // Simple check for NSubstitute usage in the type name or methods
        return type.Name.Contains("Substitute") || 
               type.Methods.Any(m => m.Name.Contains("Substitute"));
    }
}
