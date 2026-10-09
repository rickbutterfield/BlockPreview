using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Community.BlockPreview.Extensions;
using Umbraco.Community.BlockPreview.Helpers;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.NotificationHandlers;
using Umbraco.Community.BlockPreview.Services;
using Umbraco.Community.BlockPreview.ViewEngines;

namespace Umbraco.Community.BlockPreview
{
    /// <summary>
    /// Registers the Block Preview services with Umbraco.
    /// </summary>
    /// <remarks>
    /// This type is public so that your own composers can order themselves against it, for example
    /// <c>[ComposeAfter(typeof(BlockPreviewComposer))]</c> when replacing one of the Block Preview services.
    /// Disabling it with <c>[Disable(typeof(BlockPreviewComposer))]</c> is not supported: <c>AddBlockPreview()</c>
    /// only configures options, so the preview endpoints would fail without the services registered here.
    /// </remarks>
    public sealed class BlockPreviewComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.AddInternal(config => config.BindConfiguration(Constants.Configuration.AppSettingsRoot));

            builder.AddBackOfficeOpenApiDocument(
                Constants.Configuration.ApiName,
                document => document
                    .WithTitle("BlockPreview Management API")
                    .ConfigureOpenApiOptions(options =>
                        options.AddOperationTransformer((operation, context, _) =>
                        {
                            operation.OperationId = $"{context.Description.ActionDescriptor.RouteValues["action"]}";

                            // Microsoft.AspNetCore.OpenApi does not map [Obsolete] to the deprecated flag like Swashbuckle did
                            if (context.Description.ActionDescriptor.EndpointMetadata.OfType<ObsoleteAttribute>().Any())
                            {
                                operation.Deprecated = true;
                            }

                            return Task.CompletedTask;
                        })));

            builder.AddNotificationHandler<DataTypeSavedNotification, DataTypeSavedNotificationHandler>();
            builder.AddNotificationHandler<ContentTypeSavedNotification, ContentTypeSavedNotificationHandler>();

            builder.Services.AddScoped<IViewComponentHelperWrapper>(sp =>
            {
                if (sp.GetRequiredService<IViewComponentHelper>() is DefaultViewComponentHelper helper)
                {
                    return new ViewComponentHelperWrapper<DefaultViewComponentHelper>(helper);
                }

                throw new InvalidOperationException($"Expected {nameof(DefaultViewComponentHelper)} when resolving {nameof(IViewComponentHelperWrapper)}");
            });

            builder.Services.AddScoped<IBlockModelFactory, BlockModelFactory>();
            builder.Services.AddScoped<IBlockViewRenderer>(sp =>
                ActivatorUtilities.CreateInstance<BlockViewRenderer>(sp));
            builder.Services.AddScoped<IBlockDataConverter, BlockDataConverter>();
            builder.Services.AddScoped<IBlockTypeCacheService, BlockTypeCacheService>();
            builder.Services.AddSingleton<IBlockPreviewViewResolver, BlockPreviewViewResolver>();
            builder.Services.AddScoped<IBlockPreviewService>(sp =>
                ActivatorUtilities.CreateInstance<BlockPreviewService>(sp));
            builder.Services.AddScoped<IBlockPreviewRequestEnricher, NoopBlockPreviewRequestEnricher>();
            builder.Services.AddScoped<IBlockPreviewResponseEnricher, NoopBlockPreviewResponseEnricher>();

            builder.Services.AddScoped<ContextCultureService>();

            builder.Services.ConfigureOptions<BlockViewEngineOptionsSetup>();
        }
    }
}
