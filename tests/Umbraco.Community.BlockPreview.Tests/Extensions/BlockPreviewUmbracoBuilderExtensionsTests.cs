using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.BlockPreview.Extensions;

namespace Umbraco.Community.BlockPreview.Tests.Extensions;

[TestFixture]
public class BlockPreviewUmbracoBuilderExtensionsTests
{
    [Test]
    public void AddBlockPreview_WhenCalledTwice_AddsEachDefaultViewLocationOnce()
    {
        // BlockPreviewComposer and the documented AddBlockPreview() call both register the options.
        var options = BuildOptions(builder =>
        {
            builder.AddBlockPreview();
            builder.AddBlockPreview();
        });

        Assert.Multiple(() =>
        {
            Assert.That(options.BlockGrid.ViewLocations, Is.EqualTo(new[] { Constants.DefaultViewLocations.BlockGrid }));
            Assert.That(options.BlockList.ViewLocations, Is.EqualTo(new[] { Constants.DefaultViewLocations.BlockList }));
            Assert.That(options.RichText.ViewLocations, Is.EqualTo(new[] { Constants.DefaultViewLocations.RichText }));
            Assert.That(options.SingleBlock.ViewLocations, Is.EqualTo(new[] { Constants.DefaultViewLocations.SingleBlock }));
        });
    }

    [Test]
    public void AddBlockPreview_WithConfiguredViewLocation_KeepsItBeforeTheDefault()
    {
        const string custom = "/Views/Custom/{0}.cshtml";

        var options = BuildOptions(
            builder => builder.AddBlockPreview(),
            new Dictionary<string, string?> { [$"{Constants.Configuration.AppSettingsRoot}:BlockGrid:ViewLocations:0"] = custom });

        Assert.That(options.BlockGrid.ViewLocations, Is.EqualTo(new[] { custom, Constants.DefaultViewLocations.BlockGrid }));
    }

    private static BlockPreviewOptions BuildOptions(Action<IUmbracoBuilder> register, Dictionary<string, string?>? settings = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(settings ?? []).Build());

        var builder = new Mock<IUmbracoBuilder>();
        builder.SetupGet(b => b.Services).Returns(services);

        register(builder.Object);

        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IOptions<BlockPreviewOptions>>().Value;
    }
}
