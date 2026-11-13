using System.Reflection;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Cache.PropertyEditors;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Infrastructure.Serialization;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

/// <summary>
/// Umbraco 19 gives every layout item its own key (the same content key can appear several times in a layout) and lets a
/// layout item point at a Library element (<c>IsExternalContent</c>) that has no entry in the block value's content data.
/// </summary>
[TestFixture]
public class BlockPreviewServiceLibraryElementTests
{
    private static readonly Guid ElementKey = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid LayoutKeyA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid LayoutKeyB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid TypeKey = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid AreaKey = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    #region FindLayoutItem

    [Test]
    public void FindLayoutItem_SameContentKeyTwice_ReturnsTheItemWithTheLayoutKey()
    {
        var first = new BlockListLayoutItem(ElementKey) { Key = LayoutKeyA };
        var second = new BlockListLayoutItem(ElementKey) { Key = LayoutKeyB };

        Assert.Multiple(() =>
        {
            Assert.That(BlockPreviewService.FindLayoutItem([first, second], LayoutKeyB, ElementKey), Is.SameAs(second));
            Assert.That(BlockPreviewService.FindLayoutItem([first, second], LayoutKeyA, ElementKey), Is.SameAs(first));
            Assert.That(BlockPreviewService.FindLayoutItem([first, second], null, ElementKey), Is.SameAs(first),
                "without a layout key the first instance wins");
        });
    }

    [Test]
    public void FindLayoutItem_FindsAnItemInsideAnArea()
    {
        var child = new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyB };
        var parent = new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyA, Areas = [new BlockGridLayoutAreaItem(AreaKey) { Items = [child] }] };

        Assert.That(BlockPreviewService.FindLayoutItem([parent], LayoutKeyB, ElementKey), Is.SameAs(child));
    }

    [Test]
    public void FindLayoutItem_LayoutItemWithoutKey_IsIdentifiedByItsContentKey()
    {
        // Data stored before Umbraco 19 has no layout key; Umbraco gives such an item its content key.
        var legacy = new BlockListLayoutItem(ElementKey);

        Assert.That(BlockPreviewService.FindLayoutItem([legacy], ElementKey, ElementKey), Is.SameAs(legacy));
    }

    #endregion

    #region GetMatchingGridLayout

    [Test]
    public void GetMatchingGridLayout_SameContentKeyTwice_TakesTheSpansOfTheInstanceWithTheLayoutKey()
    {
        var first = new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyA, ColumnSpan = 3, RowSpan = 1 };
        var second = new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyB, ColumnSpan = 9, RowSpan = 2 };
        var block = new BlockGridItem(ElementKey, Mock.Of<IPublishedElement>(), null, null);

        var match = InvokeGetMatchingGridLayout(CreateService(Mock.Of<IBlockDataConverter>()), [first, second], block, LayoutKeyB);

        Assert.Multiple(() =>
        {
            Assert.That(match, Is.SameAs(second));
            Assert.That(block.ColumnSpan, Is.EqualTo(9));
            Assert.That(block.RowSpan, Is.EqualTo(2));
        });
    }

    [Test]
    public void GetMatchingGridLayout_SameContentKeyInAnAreaAndAtTheRoot_AreaInstanceWinsByLayoutKey()
    {
        var child = new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyB, ColumnSpan = 4, RowSpan = 3 };
        var root = new BlockGridLayoutItem(ElementKey)
        {
            Key = LayoutKeyA, ColumnSpan = 12, RowSpan = 1,
            Areas = [new BlockGridLayoutAreaItem(AreaKey) { Items = [child] }]
        };
        var block = new BlockGridItem(ElementKey, Mock.Of<IPublishedElement>(), null, null);

        InvokeGetMatchingGridLayout(CreateService(Mock.Of<IBlockDataConverter>()), [root], block, LayoutKeyB);

        Assert.Multiple(() =>
        {
            Assert.That(block.ColumnSpan, Is.EqualTo(4));
            Assert.That(block.RowSpan, Is.EqualTo(3));
        });
    }

    #endregion

    #region ResolveContentAsync

    [Test]
    public async Task ResolveContent_ExternalLayoutItem_ComesFromTheElementServiceNotTheContentData()
    {
        var element = Mock.Of<IPublishedElement>();
        var converter = new Mock<IBlockDataConverter>();
        var resolver = ResolverReturning(ExternalElementStatus.Success, element);
        var layout = new BlockListLayoutItem(ElementKey) { Key = LayoutKeyA, IsExternalContent = true };

        var resolved = await InvokeResolveContent(CreateService(converter.Object, resolver.Object), layout, [], ElementKey, "da-DK");

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Element, Is.SameAs(element));
            Assert.That(resolved.Data, Is.Null, "a Library element has no content data");
            Assert.That(resolved.Error, Is.Null);
        });
        converter.Verify(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>(), It.IsAny<string?>()), Times.Never);
    }

    [Test]
    public async Task ResolveContent_ExternalElementNotFound_ReportsItInsteadOfThrowing()
    {
        var resolver = ResolverReturning(ExternalElementStatus.NotFound, null);
        var layout = new BlockListLayoutItem(ElementKey) { IsExternalContent = true };

        var resolved = await InvokeResolveContent(CreateService(Mock.Of<IBlockDataConverter>(), resolver.Object), layout, [], ElementKey, null);

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Element, Is.Null);
            Assert.That(resolved.Error, Is.EqualTo(Constants.ErrorMessages.ExternalElementNotFound));
        });
    }

    [Test]
    public async Task ResolveContent_ExternalElementNotPermitted_ReportsItAsNotPermittedAndRendersNothing()
    {
        var resolver = ResolverReturning(ExternalElementStatus.NotPermitted, null);
        var converter = new Mock<IBlockDataConverter>();
        var layout = new BlockListLayoutItem(ElementKey) { IsExternalContent = true };
        // Even a local block with the same key must not be used instead of the denied element.
        var data = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };

        var resolved = await InvokeResolveContent(CreateService(converter.Object, resolver.Object), layout, [data], ElementKey, null);

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Element, Is.Null);
            Assert.That(resolved.Error, Is.EqualTo(Constants.ErrorMessages.ExternalElementNotPermitted));
        });
        converter.Verify(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>(), It.IsAny<string?>()), Times.Never);
    }

    [Test]
    public async Task ResolveContent_LocalBlock_PassesTheOwningPropertyCultureToTheConverter()
    {
        var data = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };
        var owner = Mock.Of<IPublishedContent>();
        var element = Mock.Of<IPublishedElement>();
        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(data, owner, "da-DK")).Returns(element);
        var layout = new BlockListLayoutItem(ElementKey) { Key = LayoutKeyA };

        var resolved = await InvokeResolveContent(CreateService(converter.Object), layout, [data], ElementKey, "da-DK", owner);

        Assert.That(resolved.Element, Is.SameAs(element));
        converter.Verify(c => c.ConvertToElement(data, owner, "da-DK"), Times.Once);
    }

    #endregion

    #region ConfigureBlockInstanceAreasAsync

    [Test]
    public async Task ConfigureAreas_SameLibraryElementInTwoAreaSlots_RendersBothAndSkipsMissingAndDeniedOnes()
    {
        var missingKey = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
        var deniedKey = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        var elementA = Mock.Of<IPublishedElement>(e => e.Key == ElementKey && e.ContentType == Mock.Of<IPublishedContentType>(t => t.Key == TypeKey));
        var resolver = new Mock<IExternalElementResolver>();
        resolver.Setup(r => r.ResolveAsync(ElementKey)).ReturnsAsync(new ExternalElementResult(ExternalElementStatus.Success, elementA));
        resolver.Setup(r => r.ResolveAsync(missingKey)).ReturnsAsync(new ExternalElementResult(ExternalElementStatus.NotFound, null));
        resolver.Setup(r => r.ResolveAsync(deniedKey)).ReturnsAsync(new ExternalElementResult(ExternalElementStatus.NotPermitted, null));

        var layout = new BlockGridLayoutItem(Guid.NewGuid())
        {
            Areas =
            [
                new BlockGridLayoutAreaItem(AreaKey)
                {
                    Items =
                    [
                        new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyA, IsExternalContent = true, ColumnSpan = 3 },
                        new BlockGridLayoutItem(deniedKey) { Key = Guid.NewGuid(), IsExternalContent = true, ColumnSpan = 5 },
                        new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyB, IsExternalContent = true, ColumnSpan = 6 },
                        new BlockGridLayoutItem(missingKey) { Key = Guid.NewGuid(), IsExternalContent = true }
                    ]
                }
            ]
        };
        var outerType = Guid.NewGuid();
        var outerConfig = new BlockGridConfiguration.BlockGridBlockConfiguration
        {
            ContentElementTypeKey = outerType,
            Areas = [new BlockGridConfiguration.BlockGridAreaConfiguration { Key = AreaKey, Alias = "slot", ColumnSpan = 12, RowSpan = 1 }]
        };
        var config = new BlockGridConfiguration { GridColumns = 12, Blocks = [outerConfig] };
        // No content data at all: every block is a Library element.
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>([], new BlockGridValue([layout]));
        var outer = new BlockGridItem(layout.ContentKey, Mock.Of<IPublishedElement>(), null, null);

        var method = typeof(BlockPreviewService).GetMethod("ConfigureBlockInstanceAreasAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        await (Task)method.Invoke(CreateService(Mock.Of<IBlockDataConverter>(), resolver.Object),
            [blockValue, outer, config, outerConfig, layout, Mock.Of<IPublishedContent>(), null])!;

        var items = outer.Areas.Single().ToList();
        Assert.Multiple(() =>
        {
            Assert.That(items.Select(x => x.ColumnSpan), Is.EqualTo(new[] { 3, 6 }), "one rendered block per permitted layout item");
            Assert.That(items.Select(x => x.Content), Is.All.SameAs(elementA));
        });
    }

    #endregion

    #region Deserializing

    // A value whose blocks are all Library elements has layouts but no content data. It must still deserialize, keeping
    // each layout item's own key and its external flag.
    [Test]
    public void DeserializeBlockList_OnlyLibraryElements_KeepsTheLayoutItems()
    {
        var json = $$"""
            {"layout":{"Umbraco.BlockList":[
              {"key":"{{LayoutKeyA}}","contentKey":"{{ElementKey}}","isExternalContent":true},
              {"key":"{{LayoutKeyB}}","contentKey":"{{ElementKey}}","isExternalContent":true}]},
             "contentData":[],"settingsData":[],"expose":[]}
            """;

        var result = CreateConverter().DeserializeBlockList(json);

        Assert.That(result, Is.Not.Null);
        var layouts = result!.BlockValue.GetLayouts()!.ToList();
        Assert.Multiple(() =>
        {
            Assert.That(layouts.Select(x => x.Key), Is.EqualTo(new[] { LayoutKeyA, LayoutKeyB }));
            Assert.That(layouts.Select(x => x.IsExternalContent), Is.All.True);
        });
    }

    #endregion

    private static BlockDataConverter CreateConverter() =>
        new(
            blockEditorConverter: null!,
            new SystemTextJsonSerializer(new DefaultJsonSerializerEncoderFactory()),
            Mock.Of<IBlockEditorElementTypeCache>(),
            Mock.Of<ILogger<BlockDataConverter>>(),
            new PropertyEditorCollection(new DataEditorCollection(() => [])),
            Mock.Of<IDataTypeConfigurationCache>());

    private static Mock<IExternalElementResolver> ResolverReturning(ExternalElementStatus status, IPublishedElement? element)
    {
        var resolver = new Mock<IExternalElementResolver>();
        resolver.Setup(r => r.ResolveAsync(It.IsAny<Guid>())).ReturnsAsync(new ExternalElementResult(status, element));
        return resolver;
    }

    // BlockPreviewService's constructor takes many services these tests don't need, so create it uninitialized and set
    // only the field the methods under test read.
    private static BlockPreviewService CreateService(IBlockDataConverter blockDataConverter, IExternalElementResolver? resolver = null)
    {
        var service = (BlockPreviewService)RuntimeHelpers.GetUninitializedObject(typeof(BlockPreviewService));
        var field = typeof(BlockPreviewService).GetField("_blockDataConverter", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(field, Is.Not.Null, "BlockPreviewService no longer has a field named _blockDataConverter; update this test.");
        field!.SetValue(service, blockDataConverter);

        var resolverField = typeof(BlockPreviewService).GetField("_externalElementResolver", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(resolverField, Is.Not.Null, "BlockPreviewService no longer has a field named _externalElementResolver; update this test.");
        resolverField!.SetValue(service, resolver);
        return service;
    }

    private static BlockGridLayoutItem? InvokeGetMatchingGridLayout(
        BlockPreviewService service, IEnumerable<BlockGridLayoutItem> layoutItems, BlockGridItem block, Guid? layoutKey)
    {
        var found = BlockPreviewService.FindLayoutItem(layoutItems, layoutKey, block.ContentKey);
        var method = typeof(BlockPreviewService).GetMethod("GetMatchingGridLayout", BindingFlags.NonPublic | BindingFlags.Instance)!;
        return (BlockGridLayoutItem?)method.Invoke(service, [layoutItems, block, 12, found]);
    }

    private static async Task<(BlockItemData? Data, IPublishedElement? Element, string? Error)> InvokeResolveContent(
        BlockPreviewService service,
        IBlockLayoutItem layout,
        BlockItemData[] contentData,
        Guid contentKey,
        string? culture,
        IPublishedContent? owner = null)
    {
        var method = typeof(BlockPreviewService).GetMethod("ResolveContentAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        var task = (Task)method.Invoke(service, [layout, contentData, contentKey, owner ?? Mock.Of<IPublishedContent>(), culture])!;
        await task;
        var result = task.GetType().GetProperty("Result")!.GetValue(task)!;
        var type = result.GetType();
        return ((BlockItemData?)type.GetProperty("Data")!.GetValue(result),
            (IPublishedElement?)type.GetProperty("Element")!.GetValue(result),
            (string?)type.GetProperty("Error")!.GetValue(result));
    }
}
