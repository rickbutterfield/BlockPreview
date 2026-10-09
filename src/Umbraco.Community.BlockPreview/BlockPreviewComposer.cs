using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
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
    internal class BlockPreviewComposer : IComposer
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

            builder.Services.TryAddScoped<IViewComponentHelperWrapper>(sp =>
            {
                if (sp.GetRequiredService<IViewComponentHelper>() is DefaultViewComponentHelper helper)
                {
                    return new ViewComponentHelperWrapper<DefaultViewComponentHelper>(helper);
                }

                throw new InvalidOperationException($"Expected {nameof(DefaultViewComponentHelper)} when resolving {nameof(IViewComponentHelperWrapper)}");
            });

            builder.Services.TryAddScoped<IBlockModelFactory, BlockModelFactory>();
            builder.Services.TryAddScoped<IBlockViewRenderer>(sp =>
                ActivatorUtilities.CreateInstance<BlockViewRenderer>(sp));
            builder.Services.TryAddScoped<IBlockDataConverter, BlockDataConverter>();
            builder.Services.TryAddScoped<IBlockTypeCacheService, BlockTypeCacheService>();
            builder.Services.TryAddSingleton<IBlockPreviewViewResolver, BlockPreviewViewResolver>();
            builder.Services.TryAddScoped<IBlockPreviewService>(sp =>
                ActivatorUtilities.CreateInstance<BlockPreviewService>(sp));
            builder.Services.TryAddScoped<IBlockPreviewRequestEnricher, NoopBlockPreviewRequestEnricher>();
            builder.Services.TryAddScoped<IBlockPreviewResponseEnricher, NoopBlockPreviewResponseEnricher>();

            builder.Services.TryAddScoped<ContextCultureService>();

            builder.Services.ConfigureOptions<BlockViewEngineOptionsSetup>();
        }
    }
}
