using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Reflection;
using System.Text.Encodings.Web;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Extensions;
using Umbraco.Community.BlockPreview.Helpers;
using Umbraco.Community.BlockPreview.Interfaces;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Service for rendering block preview views.
    /// </summary>
    public class BlockViewRenderer : IBlockViewRenderer
    {
        private readonly ITempDataProvider _tempDataProvider;
        private readonly IViewComponentHelperWrapper _viewComponentHelperWrapper;
        private readonly IRazorViewEngine _razorViewEngine;
        private readonly IViewComponentSelector _viewComponentSelector;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private readonly ILogger<BlockViewRenderer> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockViewRenderer"/> class.
        /// </summary>
        /// <param name="tempDataProvider">The temp data provider.</param>
        /// <param name="viewComponentHelperWrapper">The view component helper wrapper.</param>
        /// <param name="razorViewEngine">The Razor view engine.</param>
        /// <param name="viewComponentSelector">The view component selector.</param>
        /// <param name="serviceScopeFactory">The service scope factory.</param>
        /// <param name="logger">The logger.</param>
        [ActivatorUtilitiesConstructor]
        public BlockViewRenderer(
            ITempDataProvider tempDataProvider,
            IViewComponentHelperWrapper viewComponentHelperWrapper,
            IRazorViewEngine razorViewEngine,
            IViewComponentSelector viewComponentSelector,
            IServiceScopeFactory serviceScopeFactory,
            ILogger<BlockViewRenderer> logger)
        {
            _tempDataProvider = tempDataProvider;
            _viewComponentHelperWrapper = viewComponentHelperWrapper;
            _razorViewEngine = razorViewEngine;
            _viewComponentSelector = viewComponentSelector;
            _serviceScopeFactory = serviceScopeFactory;
            _logger = logger;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockViewRenderer"/> class.
        /// </summary>
        /// <param name="tempDataProvider">The temp data provider.</param>
        /// <param name="viewComponentHelperWrapper">The view component helper wrapper.</param>
        /// <param name="razorViewEngine">The Razor view engine.</param>
        /// <param name="viewComponentSelector">The view component selector.</param>
        [Obsolete("Use the constructor that accepts IServiceScopeFactory. Scheduled for removal in v6.")]
        public BlockViewRenderer(
            ITempDataProvider tempDataProvider,
            IViewComponentHelperWrapper viewComponentHelperWrapper,
            IRazorViewEngine razorViewEngine,
            IViewComponentSelector viewComponentSelector)
            : this(
                tempDataProvider,
                viewComponentHelperWrapper,
                razorViewEngine,
                viewComponentSelector,
                StaticServiceProvider.Instance.GetRequiredService<IServiceScopeFactory>(),
                StaticServiceProvider.Instance.GetRequiredService<ILogger<BlockViewRenderer>>())
        {
        }

        /// <inheritdoc/>
        public async Task<string> RenderAsync(BlockPreviewContext context, ViewEngineResult? viewResult = null)
        {
            _logger.LogDebug("BlockPreview: RenderAsync starting for '{ContentAlias}' (BlockType: {BlockType})",
                context.ContentAlias, context.BlockType);

            // Try ViewComponent first
            var viewComponentResult = await RenderViewComponentAsync(context);
            if (!string.IsNullOrEmpty(viewComponentResult))
                return viewComponentResult;

            if (viewComponentResult is not null)
            {
                _logger.LogWarning("BlockPreview: ViewComponent for '{ContentAlias}' returned empty string, falling through to partial view",
                    context.ContentAlias);
            }

            // Fall back to partial view
            if (viewResult == null || !viewResult.Success)
            {
                _logger.LogDebug("BlockPreview: No cached view for '{ContentAlias}', using FindView fallback",
                    context.ContentAlias);

                viewResult = _razorViewEngine.FindView(context.ControllerContext, context.ContentAlias!, false);

                if (!viewResult.Success)
                    viewResult = _razorViewEngine.FindView(context.ControllerContext, context.ContentAlias?.ToPascalCase()!, false);
            }

            if (!viewResult.Success || viewResult.View == null)
            {
                _logger.LogWarning("BlockPreview: View not found for '{ContentAlias}'. Searched: {Locations}",
                    context.ContentAlias, string.Join(", ", viewResult.SearchedLocations ?? Array.Empty<string>()));

                return string.Format(
                    Constants.ErrorMessages.WarningTemplate,
                    string.Format(
                        Constants.ErrorMessages.ViewNotFound,
                        viewResult.ViewName,
                        string.Join("<br/>", viewResult.SearchedLocations ?? Array.Empty<string>())));
            }

            var partialResult = await RenderPartialAsync(context, viewResult);

            if (string.IsNullOrEmpty(partialResult))
            {
                _logger.LogWarning("BlockPreview: RenderPartialAsync returned empty string for '{ContentAlias}' (view: {ViewName})",
                    context.ContentAlias, viewResult.ViewName);
            }

            return partialResult;
        }

        /// <inheritdoc/>
        public async Task<string> RenderPartialAsync(BlockPreviewContext context, ViewEngineResult viewResult)
        {
            if (viewResult.View == null)
            {
                return string.Format(
                    Constants.ErrorMessages.WarningTemplate,
                    string.Format(
                        Constants.ErrorMessages.ViewNotFound,
                        viewResult.ViewName,
                        string.Join("<br/>", viewResult.SearchedLocations ?? Array.Empty<string>())));
            }

            try
            {
                var actionContext = new ActionContext(
                    context.ControllerContext.HttpContext,
                    new RouteData(),
                    new ActionDescriptor());

                await using var sw = new StringWriter();

                if (context.ViewData != null)
                {
                    var viewContext = new ViewContext(
                        actionContext,
                        viewResult.View,
                        context.ViewData,
                        new TempDataDictionary(actionContext.HttpContext, _tempDataProvider),
                        sw,
                        new HtmlHelperOptions());

                    await viewResult.View.RenderAsync(viewContext);
                }

                return sw.ToString();
            }
            catch (ObjectDisposedException ex)
            {
                _logger.LogWarning(ex, "BlockPreview: ObjectDisposedException in RenderPartialAsync for '{ContentAlias}', retrying with child scope",
                    context.ContentAlias);

                // The request scope's IViewBufferScope was disposed before rendering completed
                // (race condition under load, request cancellation, or middleware timing).
                // Retry with a child scope that we control the lifetime of.
                await using var scope = _serviceScopeFactory.CreateAsyncScope();
                var httpContext = context.ControllerContext.HttpContext;
                var originalServices = httpContext.RequestServices;

                try
                {
                    httpContext.RequestServices = scope.ServiceProvider;

                    var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
                    await using var sw = new StringWriter();

                    if (context.ViewData != null)
                    {
                        var viewContext = new ViewContext(
                            actionContext,
                            viewResult.View,
                            context.ViewData,
                            new TempDataDictionary(actionContext.HttpContext, _tempDataProvider),
                            sw,
                            new HtmlHelperOptions());

                        await viewResult.View.RenderAsync(viewContext);
                    }

                    return sw.ToString();
                }
                finally
                {
                    httpContext.RequestServices = originalServices;
                }
            }
        }

        /// <inheritdoc/>
        public async Task<string?> RenderViewComponentAsync(BlockPreviewContext context)
        {
            // ViewComponents can be registered with PascalCase (default) or camelCase (ModelTypeAlias)
            var viewComponent = _viewComponentSelector.SelectComponent(context.ContentAlias?.ToPascalCase());
            viewComponent ??= _viewComponentSelector.SelectComponent(context.ContentAlias?.ToCamelCase());

            if (viewComponent == null)
                return null;

            var arguments = GetViewComponentArguments(viewComponent, context.ViewData?.Model, context.Content);

            try
            {
                await using var sw = new StringWriter();
                var viewContext = new ViewContext(
                    context.ControllerContext,
                    new FakeView(),
                    context.ViewData!,
                    new TempDataDictionary(context.ControllerContext.HttpContext, _tempDataProvider),
                    sw,
                    new HtmlHelperOptions());

                _viewComponentHelperWrapper.Contextualize(viewContext);

                var result = await _viewComponentHelperWrapper.InvokeAsync(
                    viewComponent.TypeInfo.AsType(),
                    arguments);

                result.WriteTo(sw, HtmlEncoder.Default);
                return sw.ToString();
            }
            catch (ObjectDisposedException ex)
            {
                _logger.LogWarning(ex, "BlockPreview: ObjectDisposedException in RenderViewComponentAsync for '{ContentAlias}', retrying with child scope",
                    context.ContentAlias);

                // The request scope's IViewBufferScope was disposed before rendering completed.
                // Retry with a fresh IViewComponentHelper from a child scope we control.
                await using var scope = _serviceScopeFactory.CreateAsyncScope();
                var httpContext = context.ControllerContext.HttpContext;
                var originalServices = httpContext.RequestServices;

                try
                {
                    httpContext.RequestServices = scope.ServiceProvider;

                    var freshHelper = scope.ServiceProvider.GetRequiredService<IViewComponentHelper>();
                    IViewComponentHelperWrapper helper = freshHelper is DefaultViewComponentHelper defaultHelper
                        ? new ViewComponentHelperWrapper<DefaultViewComponentHelper>(defaultHelper)
                        : _viewComponentHelperWrapper;

                    await using var sw = new StringWriter();
                    var viewContext = new ViewContext(
                        context.ControllerContext,
                        new FakeView(),
                        context.ViewData!,
                        new TempDataDictionary(httpContext, _tempDataProvider),
                        sw,
                        new HtmlHelperOptions());

                    helper.Contextualize(viewContext);

                    var result = await helper.InvokeAsync(
                        viewComponent.TypeInfo.AsType(),
                        arguments);

                    result.WriteTo(sw, HtmlEncoder.Default);
                    return sw.ToString();
                }
                finally
                {
                    httpContext.RequestServices = originalServices;
                }
            }
        }

        /// <summary>
        /// Builds the arguments passed to a ViewComponent's InvokeAsync method.
        /// A single parameter that accepts the block model gets the model itself, matching ASP.NET Core's own behaviour.
        /// Otherwise the model's properties are passed by name, and any remaining parameters that accept the block
        /// model or the current page are given those values, e.g. <c>InvokeAsync(BlockGridItem model, IPublishedContent? currentPage)</c>.
        /// </summary>
        internal static object? GetViewComponentArguments(ViewComponentDescriptor viewComponent, object? model, IPublishedContent? currentPage)
        {
            if (model == null)
                return null;

            var parameters = viewComponent.Parameters;
            if (parameters.Count == 1 && parameters[0].ParameterType.IsInstanceOfType(model))
                return model;

            var arguments = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in model.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                if (property.CanRead && property.GetIndexParameters().Length == 0)
                    arguments[property.Name] = property.GetValue(model);
            }

            foreach (var parameter in parameters)
            {
                if (parameter.Name == null || arguments.ContainsKey(parameter.Name))
                    continue;

                if (parameter.ParameterType.IsInstanceOfType(model))
                    arguments[parameter.Name] = model;
                else if (currentPage != null && parameter.ParameterType.IsInstanceOfType(currentPage))
                    arguments[parameter.Name] = currentPage;
            }

            return arguments;
        }

        private sealed class FakeView : IView
        {
            public string Path => string.Empty;

            public Task RenderAsync(ViewContext context) => Task.CompletedTask;
        }
    }
}
