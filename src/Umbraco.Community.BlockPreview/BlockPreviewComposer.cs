using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Community.BlockPreview.Configuration;
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
        /// <inheritdoc />
        public void Compose(IUmbracoBuilder builder)
        {
            builder.AddInternal(config => config.BindConfiguration(Constants.Configuration.AppSettingsRoot));

            builder.Services.ConfigureOptions<ConfigureSwaggerGenOptions>();

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

            builder.Services.AddSingleton<IOperationIdHandler, CustomOperationIdHandler>();

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
