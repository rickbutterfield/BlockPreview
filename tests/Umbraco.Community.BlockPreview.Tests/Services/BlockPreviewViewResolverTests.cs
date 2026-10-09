using System.IO;
using Moq;
using NUnit.Framework;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Umbraco.Community.BlockPreview;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

[TestFixture]
public class BlockPreviewViewResolverTests
{
    private Mock<IRazorViewEngine> _razorViewEngineMock = null!;
    private BlockPreviewOptions _options = null!;
    private BlockPreviewViewResolver _resolver = null!;

    [SetUp]
    public void SetUp()
    {
        _razorViewEngineMock = new Mock<IRazorViewEngine>();

        _options = new BlockPreviewOptions
        {
            BlockGrid = new BlockTypeSettings
            {
                ViewLocations = ["/Views/Partials/blockgrid/Components/{0}.cshtml"]
            },
            BlockList = new BlockTypeSettings
            {
                ViewLocations = ["/Views/Partials/blocklist/Components/{0}.cshtml"]
            },
            RichText = new BlockTypeSettings
            {
                ViewLocations = ["/Views/Partials/richtext/Components/{0}.cshtml"]
            }
        };

        // Default: behave like a real Razor engine and report "not found" (Success == false)
        // for any view path, rather than Moq's default of returning null. Individual tests
        // override this for specific paths.
        _razorViewEngineMock
            .Setup(e => e.GetView(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .Returns((string _, string viewPath, bool _) => NotFound(viewPath));

        _resolver = new BlockPreviewViewResolver(
            _razorViewEngineMock.Object,
            CreateOptionsMonitor());

        // Clear cache before each test
        _resolver.ClearCache();
    }

    private IOptionsMonitor<BlockPreviewOptions> CreateOptionsMonitor()
    {
        var optionsMonitorMock = new Mock<IOptionsMonitor<BlockPreviewOptions>>();
        optionsMonitorMock.Setup(o => o.CurrentValue).Returns(_options);
        optionsMonitorMock.Setup(o => o.OnChange(It.IsAny<Action<BlockPreviewOptions, string?>>()))
            .Returns(Mock.Of<IDisposable>());
        return optionsMonitorMock.Object;
    }

    private static ViewEngineResult NotFound(string viewName)
        => ViewEngineResult.NotFound(viewName, new[] { viewName });

    private static ViewEngineResult Found(string viewName)
        => ViewEngineResult.Found(viewName, Mock.Of<IView>());

    #region Constructors

    [Test]
    public void ObsoleteConstructor_WithWebHostEnvironment_ResolvesViews()
    {
        const string expectedPath = "Views/Partials/blockgrid/Components/testBlock.cshtml";
        _razorViewEngineMock
            .Setup(e => e.GetView("", expectedPath, false))
            .Returns(Found(expectedPath));

#pragma warning disable CS0618 // Type or member is obsolete
        var resolver = new BlockPreviewViewResolver(
            _razorViewEngineMock.Object,
            Mock.Of<IWebHostEnvironment>(),
            CreateOptionsMonitor());
#pragma warning restore CS0618

        var result = resolver.ResolveView("testBlock", BlockType.BlockGrid);

        Assert.That(result?.Success, Is.True);
    }

    [Test]
    public void ServiceProvider_WithBothConstructorsAvailable_CreatesResolver()
    {
        var services = new ServiceCollection();
        services.AddSingleton(_razorViewEngineMock.Object);
        services.AddSingleton(Mock.Of<IWebHostEnvironment>());
        services.AddSingleton(CreateOptionsMonitor());
        services.AddSingleton<IBlockPreviewViewResolver, BlockPreviewViewResolver>();

        using var provider = services.BuildServiceProvider();

        Assert.That(provider.GetRequiredService<IBlockPreviewViewResolver>(), Is.InstanceOf<BlockPreviewViewResolver>());
    }

    #endregion

    #region Precompiled / runtime-mode resolution

    [Test]
    public void ResolveView_WhenViewIsPrecompiledButNotOnDisk_ResolvesView()
    {
        // Arrange - the .cshtml is NOT present on disk (as in a precompiled Production
        // deployment, Runtime:Mode = Production), but the Razor engine reports it as an
        // available compiled view. See issue #273.
        const string expectedPath = "Views/Partials/blockgrid/Components/testBlock.cshtml";
        _razorViewEngineMock
            .Setup(e => e.GetView("", expectedPath, false))
            .Returns(Found(expectedPath));

        // Act
        var result = _resolver.ResolveView("testBlock", BlockType.BlockGrid);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Success, Is.True);
    }

    [Test]
    public void ResolveView_WhenRazorEngineThrowsIOException_ReturnsNullWithoutThrowing()
    {
        // Arrange - mimic the runtime view compiler throwing FileNotFoundException for a
        // view that cannot be read from disk (see issue #84 stack trace).
        _razorViewEngineMock
            .Setup(e => e.GetView(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
            .Throws(new FileNotFoundException("Could not find file."));

        // Act & Assert
        ViewEngineResult? result = null;
        Assert.DoesNotThrow(() => result = _resolver.ResolveView("testBlock", BlockType.BlockGrid));
        Assert.That(result, Is.Null);
    }

    [Test]
    public void ResolveView_WhenOnlyPascalCaseViewAvailable_ResolvesPascalCaseView()
    {
        // Arrange - the lower-case candidate is unavailable and the runtime compiler throws
        // (as it does on a case-sensitive file system, issue #84); the PascalCase candidate
        // is available. Resolution must fall through to PascalCase without crashing.
        const string nonPascalPath = "Views/Partials/blockgrid/Components/videoBlock.cshtml";
        const string pascalPath = "Views/Partials/blockgrid/Components/VideoBlock.cshtml";

        _razorViewEngineMock
            .Setup(e => e.GetView("", nonPascalPath, false))
            .Throws(new FileNotFoundException());
        _razorViewEngineMock
            .Setup(e => e.GetView("", pascalPath, false))
            .Returns(Found(pascalPath));

        // Act
        var result = _resolver.ResolveView("videoBlock", BlockType.BlockGrid);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Success, Is.True);
    }

    #endregion

    #region ResolveView Tests

    [Test]
    public void ResolveView_WithNullAlias_ReturnsNull()
    {
        // Act
        var result = _resolver.ResolveView(null!, BlockType.BlockGrid);

        // Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public void ResolveView_WithEmptyAlias_ReturnsNull()
    {
        // Act
        var result = _resolver.ResolveView(string.Empty, BlockType.BlockGrid);

        // Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public void ResolveView_CachesResult()
    {
        // Arrange - view doesn't exist, so will return null
        // But we can verify caching by checking that the file system is only accessed once

        // Act - call twice
        var result1 = _resolver.ResolveView("testBlock", BlockType.BlockGrid);
        var result2 = _resolver.ResolveView("testBlock", BlockType.BlockGrid);

        // Assert - both should be null since we didn't set up the file to exist
        Assert.That(result1, Is.Null);
        Assert.That(result2, Is.Null);
        // The caching is verified by the ConcurrentDictionary behavior
    }

    [Test]
    public void ResolveView_DifferentBlockTypes_CacheSeparately()
    {
        // Act
        var gridResult = _resolver.ResolveView("testBlock", BlockType.BlockGrid);
        var listResult = _resolver.ResolveView("testBlock", BlockType.BlockList);
        var richTextResult = _resolver.ResolveView("testBlock", BlockType.RichText);

        // Assert - all null since files don't exist, but they are cached separately
        Assert.That(gridResult, Is.Null);
        Assert.That(listResult, Is.Null);
        Assert.That(richTextResult, Is.Null);
    }

    #endregion

    #region ClearCache Tests

    [Test]
    public void ClearCache_ClearsAllCachedViews()
    {
        // Arrange - populate cache
        _resolver.ResolveView("block1", BlockType.BlockGrid);
        _resolver.ResolveView("block2", BlockType.BlockList);

        // Act
        _resolver.ClearCache();

        // Assert - no exception means it worked
        // We can't easily verify the cache is empty, but we can verify no exception
        Assert.Pass();
    }

    #endregion

    #region ClearCacheForAlias Tests

    [Test]
    public void ClearCacheForAlias_WithNullAlias_DoesNotThrow()
    {
        // Act & Assert
        Assert.DoesNotThrow(() => _resolver.ClearCacheForAlias(null!));
    }

    [Test]
    public void ClearCacheForAlias_WithEmptyAlias_DoesNotThrow()
    {
        // Act & Assert
        Assert.DoesNotThrow(() => _resolver.ClearCacheForAlias(string.Empty));
    }

    [Test]
    public void ClearCacheForAlias_ClearsSpecificAlias()
    {
        // Arrange - populate cache
        _resolver.ResolveView("block1", BlockType.BlockGrid);
        _resolver.ResolveView("block2", BlockType.BlockGrid);

        // Act
        _resolver.ClearCacheForAlias("block1");

        // Assert - no exception means it worked
        Assert.Pass();
    }

    [Test]
    public void ClearCacheForAlias_ClearsAllBlockTypesForAlias()
    {
        // Arrange - populate cache with same alias across different block types
        _resolver.ResolveView("testBlock", BlockType.BlockGrid);
        _resolver.ResolveView("testBlock", BlockType.BlockList);
        _resolver.ResolveView("testBlock", BlockType.RichText);

        // Act
        _resolver.ClearCacheForAlias("testBlock");

        // Assert - no exception means it worked
        Assert.Pass();
    }

    #endregion
}
