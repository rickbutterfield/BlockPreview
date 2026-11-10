using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Cache.PropertyEditors;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.Editors;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

/// <summary>
/// Tests for nested block handling in <see cref="BlockDataConverter.FormatBlockData"/>.
/// Uses real content type keys from the test site uSync data to verify that nested blocks
/// at various depths have their leaf properties correctly processed via ConvertPropertyValue.
/// </summary>
[TestFixture]
public class BlockDataConverterNestedTests
{
    private BlockDataConverter _converter = null!;
    private Mock<IJsonSerializer> _jsonSerializerMock = null!;
    private Mock<IBlockEditorElementTypeCache> _elementTypeCacheMock = null!;
    private Mock<IDataTypeConfigurationCache> _dataTypeConfigCacheMock = null!;
    private Mock<IDataValueEditor> _valueEditorMock = null!;

    private const string LeafEditorAlias = "Umbraco.TextBox";

    // Content type keys from test site uSync data
    private static readonly Guid NestedBlockListWrapperTypeKey = Guid.Parse("43e5784f-e3f1-4725-8d2c-876cadaba21b");
    private static readonly Guid HeroTypeKey = Guid.Parse("432b58a8-01b7-47dc-8664-f72bf1045f66");
    private static readonly Guid NestedBlockGridWrapperTypeKey = Guid.Parse("964feee4-efb3-4676-91a0-b960f26e9d92");

    [SetUp]
    public void SetUp()
    {
        _jsonSerializerMock = new Mock<IJsonSerializer>();
        _elementTypeCacheMock = new Mock<IBlockEditorElementTypeCache>();
        _dataTypeConfigCacheMock = new Mock<IDataTypeConfigurationCache>();
        _valueEditorMock = new Mock<IDataValueEditor>();

        _dataTypeConfigCacheMock
            .Setup(c => c.GetConfiguration(It.IsAny<Guid>()))
            .Returns(new object());

        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns("converted");

        var dataEditorMock = new Mock<IDataEditor>();
        dataEditorMock.Setup(e => e.Alias).Returns(LeafEditorAlias);
        dataEditorMock.Setup(e => e.GetValueEditor()).Returns(_valueEditorMock.Object);

        var dataEditorCollection = new DataEditorCollection(() => new[] { dataEditorMock.Object });
        var propertyEditors = new PropertyEditorCollection(dataEditorCollection);

        _converter = new BlockDataConverter(
            blockEditorConverter: null!,
            _jsonSerializerMock.Object,
            _elementTypeCacheMock.Object,
            Mock.Of<ILogger<BlockDataConverter>>(),
            propertyEditors,
            _dataTypeConfigCacheMock.Object);
    }

    #region Helpers

    private static IContentType CreateMockContentType(
        Guid key, string alias, params (string propertyAlias, string editorAlias)[] properties)
    {
        var propertyTypes = properties.Select(p =>
        {
            var pt = new Mock<IPropertyType>();
            pt.Setup(x => x.Alias).Returns(p.propertyAlias);
            pt.Setup(x => x.PropertyEditorAlias).Returns(p.editorAlias);
            pt.Setup(x => x.DataTypeKey).Returns(Guid.NewGuid());
            return pt.Object;
        }).ToList();

        var ct = new Mock<IContentType>();
        ct.Setup(x => x.Key).Returns(key);
        ct.Setup(x => x.Alias).Returns(alias);
        ct.Setup(x => x.CompositionPropertyTypes).Returns(propertyTypes);
        return ct.Object;
    }

    private static BlockPropertyValue CreatePropertyValueWithType(
        string alias, object? value, string editorAlias)
    {
        var propertyTypeMock = new Mock<IPropertyType>();
        propertyTypeMock.Setup(pt => pt.Alias).Returns(alias);
        propertyTypeMock.Setup(pt => pt.PropertyEditorAlias).Returns(editorAlias);
        propertyTypeMock.Setup(pt => pt.DataTypeKey).Returns(Guid.NewGuid());

        return new BlockPropertyValue
        {
            Alias = alias,
            Value = value,
            PropertyType = propertyTypeMock.Object
        };
    }

    private static BlockItemData CreateBlockItemData(
        Guid contentTypeKey, string contentTypeAlias, params BlockPropertyValue[] properties)
    {
        return new BlockItemData(Guid.NewGuid(), contentTypeKey, contentTypeAlias)
        {
            Values = properties.ToList()
        };
    }

    private static BlockListValue CreateBlockListValue(
        params (Guid contentKey, Guid contentTypeKey, BlockPropertyValue[] properties)[] blocks)
    {
        var contentData = blocks.Select(b => new BlockItemData
        {
            Key = b.contentKey,
            ContentTypeKey = b.contentTypeKey,
            Values = b.properties.ToList()
        }).ToList();

        var layouts = blocks.Select(b => new BlockListLayoutItem(b.contentKey)).ToArray();

        return new BlockListValue(layouts)
        {
            ContentData = contentData,
            Expose = blocks.Select(b => new BlockItemVariation(b.contentKey, null)).ToList()
        };
    }

    private static BlockGridValue CreateBlockGridValue(
        params (Guid contentKey, Guid contentTypeKey, BlockPropertyValue[] properties)[] blocks)
    {
        var contentData = blocks.Select(b => new BlockItemData
        {
            Key = b.contentKey,
            ContentTypeKey = b.contentTypeKey,
            Values = b.properties.ToList()
        }).ToList();

        var layouts = blocks.Select(b => new BlockGridLayoutItem(b.contentKey)
        {
            ColumnSpan = 12,
            RowSpan = 1,
            Areas = Array.Empty<BlockGridLayoutAreaItem>()
        }).ToArray();

        return new BlockGridValue(layouts)
        {
            ContentData = contentData,
            Expose = blocks.Select(b => new BlockItemVariation(b.contentKey, null)).ToList()
        };
    }

    private void SetupElementTypeCache(params IContentType[] contentTypes)
    {
        _elementTypeCacheMock
            .Setup(c => c.GetMany(It.IsAny<IEnumerable<Guid>>()))
            .Returns((IEnumerable<Guid> keys) =>
                contentTypes.Where(ct => keys.Contains(ct.Key)));
    }

    #endregion

    #region Nested BlockList (depth 2) - from block-list-test.config

    [Test]
    public void FormatBlockData_NestedBlockList_ConvertsInnerLeafProperties()
    {
        // Based on block-list-test.config: outer block wraps a BlockList containing a Hero
        var innerContentKey = Guid.NewGuid();
        var innerBlockListValue = CreateBlockListValue(
            (innerContentKey, HeroTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "headline", Value = "Test" },
                new BlockPropertyValue { Alias = "height", Value = new[] { "150" } }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockListValue>(It.IsAny<string>()))
            .Returns(innerBlockListValue);

        SetupElementTypeCache(
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias),
                ("height", LeafEditorAlias)));

        var outerBlock = CreateBlockItemData(
            NestedBlockListWrapperTypeKey, "nestedBlockListWrapper",
            CreatePropertyValueWithType("blockList", "nested-blocklist-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList));

        _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Exactly(2),
            "FromEditor should be called for both inner leaf properties (headline, height)");
    }

    #endregion

    #region Nested BlockGrid (depth 2) - from nested-block-grid-test.config

    [Test]
    public void FormatBlockData_NestedBlockGrid_ConvertsInnerLeafProperties()
    {
        // Based on nested-block-grid-test.config: outer block wraps a BlockGrid containing a Hero
        var innerContentKey = Guid.NewGuid();
        var innerBlockGridValue = CreateBlockGridValue(
            (innerContentKey, HeroTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "headline", Value = "Nested Hero" },
                new BlockPropertyValue { Alias = "height", Value = new[] { "150" } }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockGridValue>(It.IsAny<string>()))
            .Returns(innerBlockGridValue);

        SetupElementTypeCache(
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias),
                ("height", LeafEditorAlias)));

        var outerBlock = CreateBlockItemData(
            NestedBlockGridWrapperTypeKey, "nestedBlockGridWrapper",
            CreatePropertyValueWithType("nestedBlockGrid", "nested-blockgrid-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid));

        _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Exactly(2),
            "FromEditor should be called for both inner leaf properties (headline, height)");
    }

    #endregion

    #region Deeply nested (depth 3) - regression test for recursive FormatBlockData

    [Test]
    public void FormatBlockData_DeeplyNestedBlockList_ConvertsAllLevels()
    {
        // 3 levels: outer BlockList → middle BlockList → Hero with leaf properties
        // This test proves that FormatBlockData must recurse into nested blocks at every level
        var middleContentTypeKey = Guid.NewGuid();
        var middleContentKey = Guid.NewGuid();
        var deepContentKey = Guid.NewGuid();

        // Deepest level: Hero block with a leaf property
        var deepBlockListValue = CreateBlockListValue(
            (deepContentKey, HeroTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "headline", Value = "Deep nested" }
            }));

        // Middle level: wrapper with a BlockList property pointing to the deepest level
        var middleBlockListValue = CreateBlockListValue(
            (middleContentKey, middleContentTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "innerBlockList", Value = "deep-blocklist-json" }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockListValue>("middle-blocklist-json"))
            .Returns(middleBlockListValue);
        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockListValue>("deep-blocklist-json"))
            .Returns(deepBlockListValue);

        SetupElementTypeCache(
            CreateMockContentType(middleContentTypeKey, "blockListWrapper",
                ("innerBlockList", Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList)),
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias)));

        var outerBlock = CreateBlockItemData(
            NestedBlockListWrapperTypeKey, "outerWrapper",
            CreatePropertyValueWithType("blockList", "middle-blocklist-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList));

        _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Once,
            "FromEditor should be called for the deepest leaf property (headline) - proves recursion works at 3+ levels");
    }

    [Test]
    public void FormatBlockData_DeeplyNestedBlockGrid_ConvertsAllLevels()
    {
        // 3 levels: outer BlockGrid → middle BlockGrid → Hero with leaf properties
        var middleContentTypeKey = Guid.NewGuid();
        var middleContentKey = Guid.NewGuid();
        var deepContentKey = Guid.NewGuid();

        var deepBlockGridValue = CreateBlockGridValue(
            (deepContentKey, HeroTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "headline", Value = "Deep nested" }
            }));

        var middleBlockGridValue = CreateBlockGridValue(
            (middleContentKey, middleContentTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "innerBlockGrid", Value = "deep-blockgrid-json" }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockGridValue>("middle-blockgrid-json"))
            .Returns(middleBlockGridValue);
        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockGridValue>("deep-blockgrid-json"))
            .Returns(deepBlockGridValue);

        SetupElementTypeCache(
            CreateMockContentType(middleContentTypeKey, "blockGridWrapper",
                ("innerBlockGrid", Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid)),
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias)));

        var outerBlock = CreateBlockItemData(
            NestedBlockGridWrapperTypeKey, "outerWrapper",
            CreatePropertyValueWithType("nestedBlockGrid", "middle-blockgrid-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid));

        _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Once,
            "FromEditor should be called for the deepest leaf property (headline) - proves recursion works at 3+ levels");
    }

    #endregion

    #region Mixed nesting - BlockGrid containing BlockList

    [Test]
    public void FormatBlockData_BlockGridContainingBlockList_ConvertsInnerLeafProperties()
    {
        // Based on test site patterns: a BlockGrid block contains a BlockList property
        var innerContentKey = Guid.NewGuid();
        var innerBlockListValue = CreateBlockListValue(
            (innerContentKey, HeroTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "headline", Value = "Mixed nesting" }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockListValue>(It.IsAny<string>()))
            .Returns(innerBlockListValue);

        SetupElementTypeCache(
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias)));

        // Outer block is processed by FormatBlockData as a BlockGrid property
        // but the inner property is a BlockList
        var wrapperTypeKey = Guid.NewGuid();
        var wrapperContentKey = Guid.NewGuid();

        var innerBlockGridValue = CreateBlockGridValue(
            (wrapperContentKey, wrapperTypeKey, new[]
            {
                new BlockPropertyValue { Alias = "nestedList", Value = "inner-blocklist-json" }
            }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockGridValue>(It.IsAny<string>()))
            .Returns(innerBlockGridValue);

        SetupElementTypeCache(
            CreateMockContentType(wrapperTypeKey, "gridWrapper",
                ("nestedList", Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList)),
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias)));

        var outerBlock = CreateBlockItemData(
            NestedBlockGridWrapperTypeKey, "outerGridWrapper",
            CreatePropertyValueWithType("nestedBlockGrid", "outer-blockgrid-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid));

        _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Once,
            "FromEditor should be called for the leaf property inside a BlockList nested within a BlockGrid");
    }

    #endregion

    #region Issue #284 - Double conversion bug

    [Test]
    public void ConvertToElement_NestedBlockList_DoesNotDoubleConvert()
    {
        // Regression test for issue #284.
        //
        // Simulates the BlockPreviewService calling pattern:
        //   1. FormatBlockData(allContentData)   ← removed by fix
        //   2. ConvertToElement(targetBlock)
        //
        // Previously both steps processed nested blocks, causing FromEditor to be
        // called twice. Editors like MNTP return null on the second call (expects
        // JsonArray, gets already-converted String).
        //
        // The fix removed step 1 and made ConvertToElement handle leaf properties
        // directly, so each nested property is converted exactly once.
        // Uncomment the FormatBlockData call below to see the bug return.

        var innerContentKey = Guid.NewGuid();
        var innerHeadlineProp = new BlockPropertyValue { Alias = "headline", Value = "Original" };

        var innerBlockListValue = CreateBlockListValue(
            (innerContentKey, HeroTypeKey, new[] { innerHeadlineProp }));

        _jsonSerializerMock
            .Setup(s => s.Deserialize<BlockListValue>(It.IsAny<string>()))
            .Returns(innerBlockListValue);

        SetupElementTypeCache(
            CreateMockContentType(HeroTypeKey, "hero",
                ("headline", LeafEditorAlias)));

        // Simulate MNTP-like FromEditor: first call converts, subsequent calls return null
        var fromEditorCallCount = 0;
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns(() =>
            {
                fromEditorCallCount++;
                return fromEditorCallCount == 1 ? "converted-udi" : null;
            });

        var outerBlock = CreateBlockItemData(
            NestedBlockListWrapperTypeKey, "nestedBlockListWrapper",
            CreatePropertyValueWithType("blockList", "nested-blocklist-json",
                Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList));

        // BUG TRIGGER: Uncomment the next line to reproduce issue #284.
        // BlockPreviewService previously called FormatBlockData before ConvertToElement,
        // which recursed into nested blocks and called FromEditor a first time.
        // ConvertToElement then called FormatBlockData again → double conversion → null values.
        // _converter.FormatBlockData(new List<BlockItemData> { outerBlock });

        try
        {
            _converter.ConvertToElement(outerBlock, null!);
        }
        catch (NullReferenceException)
        {
            // Expected: _blockEditorConverter is null in test setup.
            // All property processing completes before this point.
        }

        Assert.That(fromEditorCallCount, Is.EqualTo(1),
            "FromEditor should only be called once per leaf property - no double conversion");
        Assert.That(innerHeadlineProp.Value, Is.EqualTo("converted-udi"),
            "Inner property value should be correctly converted, not corrupted by a second pass");
    }

    [Test]
    public void ConvertToElement_LeafProperties_AreConverted()
    {
        // Verifies the else clause in ConvertToElement that converts non-block-editor
        // properties via ConvertPropertyValue. Previously this was handled by a separate
        // FormatBlockData call in BlockPreviewService which was removed to fix issue #284.

        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns("converted");

        var leafProp = CreatePropertyValueWithType("headline", "Original", LeafEditorAlias);
        var block = CreateBlockItemData(HeroTypeKey, "hero", leafProp);

        try
        {
            _converter.ConvertToElement(block, null!);
        }
        catch (NullReferenceException)
        {
            // Expected: _blockEditorConverter is null in test setup.
        }

        Assert.That(leafProp.Value, Is.EqualTo("converted"),
            "ConvertToElement should convert leaf properties via FromEditor");
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Once);
    }

    #endregion
}
