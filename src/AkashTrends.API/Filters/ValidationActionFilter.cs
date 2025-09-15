using AkashTrends.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AkashTrends.API.Filters;

/// <summary>
/// Action filter to handle model validation errors and return consistent error responses
/// </summary>
public class ValidationActionFilter : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(x => x.ErrorMessage).ToArray()
                );

            var errorResponse = new ErrorResponse
            {
                Code = "VALIDATION_ERROR",
                Message = "One or more validation errors occurred.",
                Timestamp = DateTimeOffset.UtcNow,
                ValidationErrors = errors
            };

            context.Result = new BadRequestObjectResult(errorResponse);
        }

        base.OnActionExecuting(context);
    }
}