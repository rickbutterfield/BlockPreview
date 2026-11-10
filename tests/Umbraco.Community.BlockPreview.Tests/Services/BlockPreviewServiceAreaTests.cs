using System.Reflection;
using System.Runtime.CompilerServices;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

[TestFixture]
public class BlockPreviewServiceAreaTests
{
    private static readonly Guid OuterTypeKey = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ChildTypeKey = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid OuterKey = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid ChildKey = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid AreaKey = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    // Umbraco's own block grid model (BlockGridPropertyValueCreator.EnrichBlockItem) gives every item, at any depth:
    // GridColumns = the root grid's columns, AreaGridColumns = the item's own block configuration's value, and
    // ColumnSpan = the stored span, unchanged. The stored span can exceed the area's own span (here 12 in an area of 6):
    // Umbraco's model passes it through and its CSS caps it at render time with min(), so it isn't capped here (issue #371).
    //
    // The three numbers are different on purpose (root grid 16, the outer block's areas 10, the child's own 8) so that
    // copying the outer block's value onto the child, or using the wrong grid, fails the test.
    [TestCase(8, 8, TestName = "ConfigureBlockInstanceAreas_AreaChild_GetsRootGridColumnsAndItsOwnAreaGridColumns")]
    [TestCase(null, null, TestName = "ConfigureBlockInstanceAreas_AreaChildWithoutAreaGridColumns_StaysNullLikeUmbracosModel")]
    public void ConfigureBlockInstanceAreas_AreaChild(int? childAreaGridColumns, int? expectedAreaGridColumns)
    {
        var outerConfig = new BlockGridConfiguration.BlockGridBlockConfiguration
        {
            ContentElementTypeKey = OuterTypeKey,
            AreaGridColumns = 10,
            Areas =
            [
                new BlockGridConfiguration.BlockGridAreaConfiguration
                {
                    Key = AreaKey,
                    Alias = "left",
                    ColumnSpan = 6,
                    RowSpan = 1
                }
            ]
        };
        var childConfig = new BlockGridConfiguration.BlockGridBlockConfiguration
        {
            ContentElementTypeKey = ChildTypeKey,
            AreaGridColumns = childAreaGridColumns
        };
        var config = new BlockGridConfiguration { GridColumns = 16, Blocks = [outerConfig, childConfig] };

        // The child's stored span is 12 inside an area whose own span is 6.
        var layout = new BlockGridLayoutItem(OuterKey)
        {
            ColumnSpan = 12,
            RowSpan = 1,
            Areas =
            [
                new BlockGridLayoutAreaItem(AreaKey)
                {
                    Items = [new BlockGridLayoutItem(ChildKey) { ColumnSpan = 12, RowSpan = 1 }]
                }
            ]
        };
        var childData = new BlockItemData { Key = ChildKey, ContentTypeKey = ChildTypeKey };
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>(
            [], new BlockGridValue([layout]) { ContentData = [childData] });

        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>()))
            .Returns(Mock.Of<IPublishedElement>());
        var service = CreateService(converter.Object);

        var outer = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        ConfigureBlockInstanceAreas(service, blockValue, outer, config, outerConfig, layout, Mock.Of<IPublishedContent>());

        var child = outer.Areas.Single().Single();
        Assert.Multiple(() =>
        {
            Assert.That(child.GridColumns, Is.EqualTo(16), "the root grid's columns");
            Assert.That(child.AreaGridColumns, Is.EqualTo(expectedAreaGridColumns), "the child's own AreaGridColumns");
            Assert.That(child.ColumnSpan, Is.EqualTo(12), "the stored span passes through uncapped");

            // The outer block keeps the values it already got.
            Assert.That(outer.GridColumns, Is.EqualTo(16));
            Assert.That(outer.AreaGridColumns, Is.EqualTo(10));
        });
    }

    private static readonly Guid SettingsKey = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private static readonly Guid OrphanKey = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

    // Settings elements are stored under the layout item's SettingsKey, a different GUID from its ContentKey
    // (Umbraco's BlockPropertyValueCreatorBase looks them up that way), so an area child's settings are found by
    // SettingsKey (issue #396).
    [Test]
    public void ConfigureBlockInstanceAreas_AreaChildWithSettings_GetsItsSettings()
    {
        var (outerConfig, config) = CreateConfigurations();
        var layout = CreateLayout(new BlockGridLayoutItem(ChildKey, SettingsKey) { ColumnSpan = 12, RowSpan = 1 });

        var childData = new BlockItemData { Key = ChildKey, ContentTypeKey = ChildTypeKey };
        var settingsData = new BlockItemData { Key = SettingsKey, ContentTypeKey = ChildTypeKey };
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>(
            [], new BlockGridValue([layout]) { ContentData = [childData], SettingsData = [settingsData] });

        var contentElement = Mock.Of<IPublishedElement>();
        var settingsElement = Mock.Of<IPublishedElement>();
        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(childData, It.IsAny<IPublishedElement>())).Returns(contentElement);
        converter.Setup(c => c.ConvertToElement(settingsData, It.IsAny<IPublishedElement>())).Returns(settingsElement);

        var outer = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        ConfigureBlockInstanceAreas(CreateService(converter.Object), blockValue, outer, config, outerConfig, layout,
            Mock.Of<IPublishedContent>());

        var child = outer.Areas.Single().Single();
        Assert.Multiple(() =>
        {
            Assert.That(child.Content, Is.SameAs(contentElement));
            Assert.That(child.Settings, Is.SameAs(settingsElement));
            Assert.That(child.SettingsKey, Is.EqualTo(SettingsKey));
        });
    }

    // A layout item can outlive its content data (Umbraco's BlockEditorValues.Clean drops content data of an element
    // type that no longer exists, but not the layout items that point at it). One such child is skipped; it must not
    // fail the whole preview, and the other children still render (issue #397).
    [Test]
    public void ConfigureBlockInstanceAreas_AreaChildWithoutContentData_IsSkipped()
    {
        var (outerConfig, config) = CreateConfigurations();
        var layout = CreateLayout(
            new BlockGridLayoutItem(OrphanKey) { ColumnSpan = 12, RowSpan = 1 },
            new BlockGridLayoutItem(ChildKey) { ColumnSpan = 12, RowSpan = 1 });

        var childData = new BlockItemData { Key = ChildKey, ContentTypeKey = ChildTypeKey };
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>(
            [], new BlockGridValue([layout]) { ContentData = [childData] });

        // Like Umbraco's converter, this one can't take null content data.
        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>()))
            .Returns<BlockItemData, IPublishedElement>((data, _) =>
                data == null ? throw new ArgumentNullException(nameof(data)) : Mock.Of<IPublishedElement>());

        var outer = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        ConfigureBlockInstanceAreas(CreateService(converter.Object), blockValue, outer, config, outerConfig, layout,
            Mock.Of<IPublishedContent>());

        Assert.That(outer.Areas.Single().Select(x => x.ContentKey), Is.EqualTo(new[] { ChildKey }));
    }

    // Umbraco's model leaves AreaGridColumns null when the block configuration has none, and its areas.cshtml (and
    // docs/usage.md) use AreaGridColumns ?? GridColumns ?? 12, so a default of 12 here would hide the root grid's columns
    // on a grid that isn't 12 wide (issue #398).
    [Test]
    public void ConfigureBlockInstanceAreas_OuterBlockWithoutAreaGridColumns_StaysNull()
    {
        var (outerConfig, config) = CreateConfigurations();
        config.GridColumns = 16;
        var layout = CreateLayout(new BlockGridLayoutItem(ChildKey) { ColumnSpan = 12, RowSpan = 1 });
        var childData = new BlockItemData { Key = ChildKey, ContentTypeKey = ChildTypeKey };
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>(
            [], new BlockGridValue([layout]) { ContentData = [childData] });

        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>()))
            .Returns(Mock.Of<IPublishedElement>());
        var outer = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        ConfigureBlockInstanceAreas(CreateService(converter.Object), blockValue, outer, config, outerConfig, layout,
            Mock.Of<IPublishedContent>());

        Assert.Multiple(() =>
        {
            Assert.That(outer.GridColumns, Is.EqualTo(16));
            Assert.That(outer.AreaGridColumns, Is.Null);
            Assert.That(outer.Areas.Single().Single().AreaGridColumns, Is.Null);
        });
    }

    // Umbraco's model gives an item without a stored span the root grid's columns (layoutItem.ColumnSpan ??
    // gridColumns ?? 12) at every depth, not a fixed 12 or its parent's span (issue #399). A stored span passes through.
    [TestCase(null, 16, TestName = "GetMatchingGridLayout_RootBlockWithoutSpan_GetsRootGridColumns")]
    [TestCase(6, 6, TestName = "GetMatchingGridLayout_RootBlockWithSpan_KeepsIt")]
    public void GetMatchingGridLayout_RootBlock(int? storedSpan, int expectedSpan)
    {
        var layout = new BlockGridLayoutItem(OuterKey) { ColumnSpan = storedSpan, RowSpan = 2 };
        var block = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        var match = GetMatchingGridLayout([layout], block, 16);

        Assert.Multiple(() =>
        {
            Assert.That(match, Is.SameAs(layout));
            Assert.That(block.ColumnSpan, Is.EqualTo(expectedSpan));
            Assert.That(block.RowSpan, Is.EqualTo(2));
        });
    }

    [TestCase(null, 16, TestName = "GetMatchingGridLayout_AreaChildWithoutSpan_GetsRootGridColumnsNotItsParentsSpan")]
    [TestCase(4, 4, TestName = "GetMatchingGridLayout_AreaChildWithSpan_KeepsIt")]
    public void GetMatchingGridLayout_AreaChild(int? storedSpan, int expectedSpan)
    {
        var parent = new BlockGridLayoutItem(OuterKey)
        {
            ColumnSpan = 10,
            RowSpan = 1,
            Areas = [new BlockGridLayoutAreaItem(AreaKey) { Items = [new BlockGridLayoutItem(ChildKey) { ColumnSpan = storedSpan, RowSpan = 3 }] }]
        };
        var block = new BlockGridItem(ChildKey, Mock.Of<IPublishedElement>(), null, null);

        var match = GetMatchingGridLayout([parent], block, 16);

        Assert.Multiple(() =>
        {
            Assert.That(match, Is.SameAs(parent));
            Assert.That(block.ColumnSpan, Is.EqualTo(expectedSpan));
            Assert.That(block.RowSpan, Is.EqualTo(3));
        });
    }

    [Test]
    public void GetMatchingGridLayout_NoMatch_ReturnsNull()
    {
        var block = new BlockGridItem(ChildKey, Mock.Of<IPublishedElement>(), null, null);

        Assert.That(GetMatchingGridLayout([new BlockGridLayoutItem(OuterKey)], block, 16), Is.Null);
    }

    private static BlockGridLayoutItem? GetMatchingGridLayout(
        IEnumerable<BlockGridLayoutItem> layoutItems, BlockGridItem blockInstance, int gridColumns)
    {
        var method = typeof(BlockPreviewService).GetMethod(
            "GetMatchingGridLayout", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(method, Is.Not.Null,
            "BlockPreviewService no longer has a private GetMatchingGridLayout method; update this test.");

        // It uses no state, so an uninitialized instance is enough.
        var service = (BlockPreviewService)RuntimeHelpers.GetUninitializedObject(typeof(BlockPreviewService));
        return (BlockGridLayoutItem?)method!.Invoke(service, [layoutItems, blockInstance, gridColumns]);
    }

    // Umbraco's model gives an item without a stored span the root grid's columns at every depth, and an area without
    // its own span the block's AreaGridColumns, then the root grid's columns (issue #413). The numbers are distinct on
    // purpose (root grid 16, the block's areas 10) so that using the wrong source fails the test.
    [TestCase(null, null, 16, 16, TestName = "ConfigureBlockInstanceAreas_NoSpansStored_FallBackToRootGridColumns")]
    [TestCase(null, 10, 16, 10, TestName = "ConfigureBlockInstanceAreas_AreaWithoutSpan_FallsBackToTheBlocksAreaGridColumns")]
    [TestCase(6, 10, 16, 6, TestName = "ConfigureBlockInstanceAreas_AreaWithSpan_KeepsIt")]
    public void ConfigureBlockInstanceAreas_SpanFallbacks(
        int? areaSpan, int? blockAreaGridColumns, int expectedChildSpan, int expectedAreaSpan)
    {
        var (outerConfig, config) = CreateConfigurations();
        config.GridColumns = 16;
        outerConfig.AreaGridColumns = blockAreaGridColumns;
        outerConfig.Areas[0].ColumnSpan = areaSpan;
        // The child has no stored span.
        var layout = CreateLayout(new BlockGridLayoutItem(ChildKey) { ColumnSpan = null, RowSpan = 1 });
        var childData = new BlockItemData { Key = ChildKey, ContentTypeKey = ChildTypeKey };
        var blockValue = new BlockEditorData<BlockGridValue, BlockGridLayoutItem>(
            [], new BlockGridValue([layout]) { ContentData = [childData] });

        var converter = new Mock<IBlockDataConverter>();
        converter.Setup(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>()))
            .Returns(Mock.Of<IPublishedElement>());
        var outer = new BlockGridItem(OuterKey, Mock.Of<IPublishedElement>(), null, null);

        ConfigureBlockInstanceAreas(CreateService(converter.Object), blockValue, outer, config, outerConfig, layout,
            Mock.Of<IPublishedContent>());

        var area = outer.Areas.Single();
        Assert.Multiple(() =>
        {
            Assert.That(area.ColumnSpan, Is.EqualTo(expectedAreaSpan), "the area's own span");
            Assert.That(area.Single().ColumnSpan, Is.EqualTo(expectedChildSpan), "the child's span: the root grid's columns, not the area's");
        });
    }

    private static (BlockGridConfiguration.BlockGridBlockConfiguration Outer, BlockGridConfiguration Config) CreateConfigurations()
    {
        var outerConfig = new BlockGridConfiguration.BlockGridBlockConfiguration
        {
            ContentElementTypeKey = OuterTypeKey,
            Areas =
            [
                new BlockGridConfiguration.BlockGridAreaConfiguration { Key = AreaKey, Alias = "left", ColumnSpan = 6, RowSpan = 1 }
            ]
        };
        var childConfig = new BlockGridConfiguration.BlockGridBlockConfiguration { ContentElementTypeKey = ChildTypeKey };
        return (outerConfig, new BlockGridConfiguration { GridColumns = 12, Blocks = [outerConfig, childConfig] });
    }

    private static BlockGridLayoutItem CreateLayout(params BlockGridLayoutItem[] areaItems) =>
        new(OuterKey)
        {
            ColumnSpan = 12,
            RowSpan = 1,
            Areas = [new BlockGridLayoutAreaItem(AreaKey) { Items = areaItems }]
        };

    // BlockPreviewService's constructor takes several services this test doesn't need, so create it uninitialized and
    // set only the field that ConfigureBlockInstanceAreas reads.
    private static BlockPreviewService CreateService(IBlockDataConverter blockDataConverter)
    {
        var service = (BlockPreviewService)RuntimeHelpers.GetUninitializedObject(typeof(BlockPreviewService));

        var field = typeof(BlockPreviewService).GetField("_blockDataConverter", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(field, Is.Not.Null,
            "BlockPreviewService no longer has a field named _blockDataConverter; update this test.");
        field!.SetValue(service, blockDataConverter);

        return service;
    }

    private static void ConfigureBlockInstanceAreas(
        BlockPreviewService service,
        BlockEditorData<BlockGridValue, BlockGridLayoutItem> blockValue,
        BlockGridItem blockInstance,
        BlockGridConfiguration config,
        BlockGridConfiguration.BlockGridBlockConfiguration matchingBlock,
        BlockGridLayoutItem layoutItem,
        IPublishedContent content)
    {
        var method = typeof(BlockPreviewService).GetMethod(
            "ConfigureBlockInstanceAreas", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(method, Is.Not.Null,
            "BlockPreviewService no longer has a private ConfigureBlockInstanceAreas method; update this test.");

        method!.Invoke(service, [blockValue, blockInstance, config, matchingBlock, layoutItem, content]);
    }
}
