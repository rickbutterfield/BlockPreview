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
    [TestCase(null, 12, TestName = "ConfigureBlockInstanceAreas_AreaChildWithoutAreaGridColumns_DefaultsLikeTheOuterBlock")]
    public void ConfigureBlockInstanceAreas_AreaChild(int? childAreaGridColumns, int expectedAreaGridColumns)
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
