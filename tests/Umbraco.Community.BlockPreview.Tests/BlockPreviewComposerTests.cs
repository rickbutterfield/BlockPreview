using Microsoft.Extensions.DependencyInjection;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;
using Umbraco.Extensions;

namespace Umbraco.Community.BlockPreview.Tests;

[TestFixture]
public class BlockPreviewComposerTests
{
    private ServiceCollection _services = null!;
    private Mock<IUmbracoBuilder> _builder = null!;

    [SetUp]
    public void SetUp()
    {
        _services = new ServiceCollection();
        _builder = new Mock<IUmbracoBuilder>();
        _builder.SetupGet(b => b.Services).Returns(_services);
    }

    [Test]
    public void Compose_WithNoCustomRegistration_RegistersNoopRequestEnricher()
    {
        Compose();

        Assert.That(ResolveImplementationType<IBlockPreviewRequestEnricher>(), Is.EqualTo(typeof(NoopBlockPreviewRequestEnricher)));
    }

    [Test]
    public void Compose_AfterCustomRequestEnricherRegistered_KeepsCustomEnricher()
    {
        _services.AddUnique<IBlockPreviewRequestEnricher, CustomRequestEnricher>(ServiceLifetime.Scoped);

        Compose();

        Assert.That(ResolveImplementationType<IBlockPreviewRequestEnricher>(), Is.EqualTo(typeof(CustomRequestEnricher)));
    }

    [Test]
    public void Compose_AfterCustomResponseEnricherRegistered_KeepsCustomEnricher()
    {
        _services.AddScoped<IBlockPreviewResponseEnricher, CustomResponseEnricher>();

        Compose();

        Assert.That(ResolveImplementationType<IBlockPreviewResponseEnricher>(), Is.EqualTo(typeof(CustomResponseEnricher)));
    }

    [Test]
    public void Compose_BeforeCustomRequestEnricherRegistered_UsesCustomEnricher()
    {
        Compose();

        _services.AddUnique<IBlockPreviewRequestEnricher, CustomRequestEnricher>(ServiceLifetime.Scoped);

        Assert.That(ResolveImplementationType<IBlockPreviewRequestEnricher>(), Is.EqualTo(typeof(CustomRequestEnricher)));
    }

    [Test]
    public void Compose_RegistersTheExternalElementResolver()
    {
        Compose();

        Assert.That(ResolveImplementationType<IExternalElementResolver>(), Is.Not.Null);
    }

    // The obsolete BlockPreviewService constructor resolves the resolver from the root provider
    // (StaticServiceProvider.Instance). With scope validation on, as in ASP.NET Core Development, that fails for a
    // scoped registration.
    [Test]
    public void Compose_ExternalElementResolver_ResolvesFromTheRootProviderWithScopeValidation()
    {
        Compose();
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.PublishedCache.IElementCacheService>());
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.Services.IElementPermissionService>());
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.Security.IBackOfficeSecurityAccessor>());
        _services.AddLogging();

        using var provider = _services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = false });

        Assert.That(provider.GetRequiredService<IExternalElementResolver>(), Is.Not.Null);
    }

    [Test]
    public void ObsoleteBlockPreviewServiceConstructor_GetsTheResolverFromTheRootProvider()
    {
        Compose();
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.PublishedCache.IElementCacheService>());
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.Services.IElementPermissionService>());
        _services.AddSingleton(Mock.Of<Umbraco.Cms.Core.Security.IBackOfficeSecurityAccessor>());
        _services.AddLogging();

        var previous = Umbraco.Cms.Core.DependencyInjection.StaticServiceProvider.Instance;
        using var provider = _services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        Umbraco.Cms.Core.DependencyInjection.StaticServiceProvider.Instance = provider;
        try
        {
            // Call the obsolete nine-parameter constructor by reflection: this test is about its behaviour, not its use.
            var obsolete = typeof(BlockPreviewService).GetConstructors()
                .Single(c => c.GetParameters().Length == 9 && c.GetCustomAttributes(typeof(ObsoleteAttribute), false).Length == 1);
            var blockEditorConverter = new Umbraco.Cms.Core.PropertyEditors.ValueConverters.BlockEditorConverter(
                Mock.Of<Umbraco.Cms.Core.PublishedCache.IPublishedContentTypeCache>(),
                Mock.Of<IPublishedModelFactory>(),
                Mock.Of<IVariationContextAccessor>(),
                new Umbraco.Cms.Core.PropertyEditors.ValueConverters.BlockEditorVarianceHandler(
                    Mock.Of<Umbraco.Cms.Core.Services.ILanguageService>(),
                    Mock.Of<Umbraco.Cms.Core.Services.IContentTypeService>(),
                    Mock.Of<IVariationContextAccessor>()),
                Mock.Of<Umbraco.Cms.Core.PublishedCache.IBlockElementService>());

            Assert.DoesNotThrow(() => obsolete.Invoke(
            [
                Mock.Of<IPublishedModelFactory>(),
                blockEditorConverter,
                Microsoft.Extensions.Options.Options.Create(new BlockPreviewOptions()),
                Mock.Of<Umbraco.Cms.Core.Serialization.IJsonSerializer>(),
                Mock.Of<IBlockModelFactory>(),
                Mock.Of<IBlockViewRenderer>(),
                Mock.Of<IBlockDataConverter>(),
                Mock.Of<IBlockTypeCacheService>(),
                Mock.Of<IBlockPreviewViewResolver>()
            ]));
        }
        finally
        {
            Umbraco.Cms.Core.DependencyInjection.StaticServiceProvider.Instance = previous;
        }
    }

    private void Compose()
    {
        // BlockPreviewComposer is internal, so create it through the assembly it lives in.
        var composerType = typeof(BlockPreviewOptions).Assembly.GetType("Umbraco.Community.BlockPreview.BlockPreviewComposer", throwOnError: true)!;
        var composer = (IComposer)Activator.CreateInstance(composerType, nonPublic: true)!;

        composer.Compose(_builder.Object);
    }

    // Last registration wins when a single service is resolved, which is what the API controller does.
    private Type? ResolveImplementationType<TService>()
        => _services.Last(d => d.ServiceType == typeof(TService)).ImplementationType;

    private sealed class CustomRequestEnricher : IBlockPreviewRequestEnricher
    {
        public Task EnrichAsync(
            Microsoft.AspNetCore.Http.HttpContext httpContext,
            IPublishedContent? content,
            string? blockEditorAlias = null,
            string? contentElementAlias = null,
            string? contentUdi = null,
            string? settingsUdi = null,
            int? blockIndex = null) => Task.CompletedTask;
    }

    private sealed class CustomResponseEnricher : IBlockPreviewResponseEnricher
    {
        public Task<string> EnrichAsync(
            string markup,
            Microsoft.AspNetCore.Http.HttpContext httpContext,
            IPublishedContent? content,
            string? blockEditorAlias = null,
            string? contentElementAlias = null,
            string? contentUdi = null,
            string? settingsUdi = null,
            int? blockIndex = null) => Task.FromResult(markup);
    }
}
