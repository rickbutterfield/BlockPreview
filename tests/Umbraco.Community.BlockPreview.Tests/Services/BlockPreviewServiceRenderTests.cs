using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Cache.PropertyEditors;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Serialization;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

/// <summary>
/// Tests through the public Render*Block methods, so that the <see cref="BlockRenderOptions"/> are proven to reach the
/// layout lookup and the element conversion.
/// </summary>
[TestFixture]
public class BlockPreviewServiceRenderTests
{
    private static readonly Guid ElementKey = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid OtherElementKey = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid TypeKey = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid SettingsKey = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid LayoutKeyA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid LayoutKeyB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid DocumentTypeKey = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid DataTypeKey = Guid.Parse("66666666-6666-6666-6666-666666666666");

    private Mock<IBlockDataConverter> _converter = null!;
    private Mock<IExternalElementResolver> _resolver = null!;
    private object? _renderedModel;
    private IPublishedContent _page = null!;
    private BlockPreviewService _service = null!;
    private IPublishedElement _localElement = null!;
    private IPublishedElement _externalElement = null!;

    private sealed class TestModel;

    [SetUp]
    public void SetUp()
    {
        _renderedModel = null;
        _page = Mock.Of<IPublishedContent>();
        _localElement = CreateElement(ElementKey);
        _externalElement = CreateElement(OtherElementKey);

        _converter = new Mock<IBlockDataConverter>();
        _converter.Setup(c => c.ConvertToElement(It.IsAny<BlockItemData>(), It.IsAny<IPublishedElement>(), It.IsAny<string?>()))
            .Returns(_localElement);

        _resolver = new Mock<IExternalElementResolver>();
        _resolver.Setup(r => r.ResolveAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new ExternalElementResult(ExternalElementStatus.Success, _externalElement));

        var typeCache = new Mock<IPublishedContentTypeCache>();
        typeCache.Setup(c => c.Get(PublishedItemType.Content, TypeKey))
            .Returns(Mock.Of<IPublishedContentType>(t => t.IsElement == true && t.Alias == "testElement" && t.Key == TypeKey));
        var modelFactory = new Mock<IPublishedModelFactory>();
        modelFactory.Setup(f => f.GetModelType("testElement")).Returns(typeof(TestModel));
        var blockEditorConverter = new BlockEditorConverter(
            typeCache.Object,
            modelFactory.Object,
            Mock.Of<IVariationContextAccessor>(),
            new BlockEditorVarianceHandler(Mock.Of<ILanguageService>(), Mock.Of<IContentTypeService>(), Mock.Of<IVariationContextAccessor>()),
            Mock.Of<IBlockElementService>());

        var blockModelFactory = new Mock<IBlockModelFactory>();
        blockModelFactory
            .Setup(f => f.CreateBlockInstance(It.IsAny<BlockType>(), It.IsAny<Type?>(), It.IsAny<IPublishedElement?>(), It.IsAny<Type?>(), It.IsAny<IPublishedElement?>(), It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .Returns((BlockType type, Type? _, IPublishedElement? content, Type? _, IPublishedElement? settings, Guid contentKey, Guid? settingsKey) => type switch
            {
                BlockType.BlockGrid => new BlockGridItem(contentKey, content!, settingsKey, settings!),
                BlockType.RichText => new RichTextBlockItem(contentKey, content!, settingsKey, settings!),
                _ => new BlockListItem(contentKey, content!, settingsKey, settings!)
            });

        var renderer = new Mock<IBlockViewRenderer>();
        renderer.Setup(r => r.RenderAsync(It.IsAny<BlockPreviewContext>(), It.IsAny<Microsoft.AspNetCore.Mvc.ViewEngines.ViewEngineResult?>()))
            .Callback((BlockPreviewContext context, Microsoft.AspNetCore.Mvc.ViewEngines.ViewEngineResult? _) => _renderedModel = context.ViewData?.Model)
            .ReturnsAsync("<p>rendered</p>");

        var blockTypeCache = new Mock<IBlockTypeCacheService>();
        var propertyType = Mock.Of<IPropertyType>(p => p.Alias == "blocks" && p.DataTypeKey == DataTypeKey);
        blockTypeCache.Setup(c => c.GetContentType(DocumentTypeKey))
            .ReturnsAsync(Mock.Of<IContentType>(c => c.PropertyTypes == new[] { propertyType }));
        var gridConfiguration = new BlockGridConfiguration
        {
            GridColumns = 12,
            Blocks = [new BlockGridConfiguration.BlockGridBlockConfiguration { ContentElementTypeKey = TypeKey }]
        };
        blockTypeCache.Setup(c => c.GetDataType(DataTypeKey)).ReturnsAsync(Mock.Of<IDataType>(d => d.ConfigurationObject == gridConfiguration));

        _service = new BlockPreviewService(
            modelFactory.Object,
            blockEditorConverter,
            Options.Create(new BlockPreviewOptions()),
            new SystemTextJsonSerializer(new DefaultJsonSerializerEncoderFactory()),
            blockModelFactory.Object,
            renderer.Object,
            _converter.Object,
            blockTypeCache.Object,
            Mock.Of<IBlockPreviewViewResolver>(),
            _resolver.Object);
    }

    #region Block List

    // The same content key sits in the layout twice with different layout keys, and only the second is a Library
    // block, so which element renders shows which layout item was picked.
    [TestCase("a", false)]
    [TestCase("b", true)]
    public async Task RenderListBlock_DuplicateContentKey_RendersTheInstanceWithTheLayoutKey(string layoutKey, bool expectExternal)
    {
        var data = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };
        var layouts = new[]
        {
            new BlockListLayoutItem(ElementKey) { Key = LayoutKeyA },
            new BlockListLayoutItem(ElementKey) { Key = LayoutKeyB, IsExternalContent = true }
        };
        _converter.Setup(c => c.DeserializeBlockList(It.IsAny<string?>()))
            .Returns(new BlockEditorData<BlockListValue, BlockListLayoutItem>([], new BlockListValue(layouts) { ContentData = [data] }));

        await _service.RenderListBlock("{}", _page, new ControllerContext(),
            new BlockRenderOptions { LayoutKey = layoutKey == "a" ? LayoutKeyA : LayoutKeyB },
            contentKey: ElementKey.ToString());

        if (expectExternal)
        {
            _resolver.Verify(r => r.ResolveAsync(ElementKey), Times.Once);
            Assert.That(((BlockListItem)_renderedModel!).Content, Is.SameAs(_externalElement));
        }
        else
        {
            _resolver.Verify(r => r.ResolveAsync(It.IsAny<Guid>()), Times.Never);
            Assert.That(((BlockListItem)_renderedModel!).Content, Is.SameAs(_localElement));
        }
    }

    [Test]
    public async Task RenderListBlock_OwningPropertyCulture_ReachesTheContentAndTheSettingsConversion()
    {
        var content = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };
        var settings = new BlockItemData { Key = SettingsKey, ContentTypeKey = TypeKey };
        _converter.Setup(c => c.DeserializeBlockList(It.IsAny<string?>())).Returns(
            new BlockEditorData<BlockListValue, BlockListLayoutItem>([], new BlockListValue([new BlockListLayoutItem(ElementKey, SettingsKey)])
            {
                ContentData = [content],
                SettingsData = [settings]
            }));

        await _service.RenderListBlock("{}", _page, new ControllerContext(),
            new BlockRenderOptions { OwningPropertyCulture = "da-DK" },
            contentKey: ElementKey.ToString(), settingsKey: SettingsKey.ToString());

        _converter.Verify(c => c.ConvertToElement(content, _page, "da-DK"), Times.Once);
        _converter.Verify(c => c.ConvertToElement(settings, _page, "da-DK"), Times.Once);
    }

    [Test]
    public async Task RenderListBlock_DeniedLibraryElement_ShowsANotPermittedAlertAndRendersNothing()
    {
        _resolver.Setup(r => r.ResolveAsync(ElementKey))
            .ReturnsAsync(new ExternalElementResult(ExternalElementStatus.NotPermitted, null));
        _converter.Setup(c => c.DeserializeBlockList(It.IsAny<string?>())).Returns(
            new BlockEditorData<BlockListValue, BlockListLayoutItem>([],
                new BlockListValue([new BlockListLayoutItem(ElementKey) { Key = LayoutKeyA, IsExternalContent = true }])));
        // The fallback deserialization of a value without content data reads this JSON.
        var json = $$"""{"layout":{"Umbraco.BlockList":[{"key":"{{LayoutKeyA}}","contentKey":"{{ElementKey}}","isExternalContent":true}]},"contentData":[],"settingsData":[],"expose":[]}""";

        var markup = await _service.RenderListBlock(json, _page, new ControllerContext(),
            new BlockRenderOptions { LayoutKey = LayoutKeyA }, contentKey: ElementKey.ToString());

        Assert.Multiple(() =>
        {
            Assert.That(markup, Does.Contain(Constants.ErrorMessages.ExternalElementNotPermitted));
            Assert.That(_renderedModel, Is.Null, "nothing is rendered for an element the user may not browse");
        });
    }

    #endregion

    #region Block Grid

    [Test]
    public async Task RenderGridBlock_DuplicateContentKey_TakesTheSpansOfTheInstanceWithTheLayoutKey()
    {
        var data = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };
        var layouts = new[]
        {
            new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyA, ColumnSpan = 3, RowSpan = 1 },
            new BlockGridLayoutItem(ElementKey) { Key = LayoutKeyB, ColumnSpan = 9, RowSpan = 2 }
        };
        _converter.Setup(c => c.DeserializeBlockGrid(It.IsAny<string?>()))
            .Returns(new BlockEditorData<BlockGridValue, BlockGridLayoutItem>([], new BlockGridValue(layouts) { ContentData = [data] }));

        await _service.RenderGridBlock("{}", _page, new ControllerContext(),
            new BlockRenderOptions { LayoutKey = LayoutKeyB },
            "blocks", DocumentTypeKey, ElementKey.ToString());

        var rendered = (BlockGridItem)_renderedModel!;
        Assert.Multiple(() =>
        {
            Assert.That(rendered.ColumnSpan, Is.EqualTo(9));
            Assert.That(rendered.RowSpan, Is.EqualTo(2));
        });
    }

    [Test]
    public async Task RenderGridBlock_OwningPropertyCulture_ReachesTheContentAndTheSettingsConversion()
    {
        var content = new BlockItemData { Key = ElementKey, ContentTypeKey = TypeKey };
        var settings = new BlockItemData { Key = SettingsKey, ContentTypeKey = TypeKey };
        _converter.Setup(c => c.DeserializeBlockGrid(It.IsAny<string?>())).Returns(
            new BlockEditorData<BlockGridValue, BlockGridLayoutItem>([], new BlockGridValue([new BlockGridLayoutItem(ElementKey, SettingsKey)])
            {
                ContentData = [content],
                SettingsData = [settings]
            }));

        await _service.RenderGridBlock("{}", _page, new ControllerContext(),
            new BlockRenderOptions { OwningPropertyCulture = "da-DK" },
            "blocks", DocumentTypeKey, ElementKey.ToString(), SettingsKey.ToString());

        _converter.Verify(c => c.ConvertToElement(content, _page, "da-DK"), Times.Once);
        _converter.Verify(c => c.ConvertToElement(settings, _page, "da-DK"), Times.Once);
    }

    [Test]
    public async Task RenderGridBlock_LibraryElement_RendersWithoutContentData()
    {
        _converter.Setup(c => c.DeserializeBlockGrid(It.IsAny<string?>())).Returns(
            new BlockEditorData<BlockGridValue, BlockGridLayoutItem>([],
                new BlockGridValue([new BlockGridLayoutItem(OtherElementKey) { Key = LayoutKeyA, IsExternalContent = true, ColumnSpan = 6 }])));
        var json = $$"""{"layout":{"Umbraco.BlockGrid":[{"key":"{{LayoutKeyA}}","contentKey":"{{OtherElementKey}}","isExternalContent":true,"columnSpan":6,"areas":[]}]},"contentData":[],"settingsData":[],"expose":[]}""";

        await _service.RenderGridBlock(json, _page, new ControllerContext(),
            new BlockRenderOptions { LayoutKey = LayoutKeyA },
            "blocks", DocumentTypeKey, OtherElementKey.ToString());

        var rendered = (BlockGridItem)_renderedModel!;
        Assert.Multiple(() =>
        {
            Assert.That(rendered.Content, Is.SameAs(_externalElement));
            Assert.That(rendered.ColumnSpan, Is.EqualTo(6));
        });
    }

    #endregion

    #region Rich text

    // The value holds one block. With only Library blocks there is no content data, so the layout key (or else the
    // first external item) says which one to render.
    [TestCase(null, "first")]
    [TestCase("b", "second")]
    public async Task RenderRichTextBlock_OnlyLibraryElements_RendersTheItemWithTheLayoutKeyOrTheFirst(string? layoutKey, string expected)
    {
        var firstKey = ElementKey;
        var secondKey = OtherElementKey;
        var layouts = new[]
        {
            new RichTextBlockLayoutItem(firstKey) { Key = LayoutKeyA, IsExternalContent = true },
            new RichTextBlockLayoutItem(secondKey) { Key = LayoutKeyB, IsExternalContent = true }
        };
        _converter.Setup(c => c.DeserializeRichText(It.IsAny<string?>()))
            .Returns(new BlockEditorData<RichTextBlockValue, RichTextBlockLayoutItem>([], new RichTextBlockValue(layouts)));
        var json = $$"""{"layout":{"Umbraco.RichText":[{"key":"{{LayoutKeyA}}","contentKey":"{{firstKey}}","isExternalContent":true},{"key":"{{LayoutKeyB}}","contentKey":"{{secondKey}}","isExternalContent":true}]},"contentData":[],"settingsData":[],"expose":[]}""";

        await _service.RenderRichTextBlock(json, _page, new ControllerContext(),
            new BlockRenderOptions { LayoutKey = layoutKey == null ? null : LayoutKeyB });

        _resolver.Verify(r => r.ResolveAsync(expected == "first" ? firstKey : secondKey), Times.Once);
        _resolver.Verify(r => r.ResolveAsync(expected == "first" ? secondKey : firstKey), Times.Never);
        Assert.That(((RichTextBlockItem)_renderedModel!).Content, Is.SameAs(_externalElement));
    }

    #endregion

    private static IPublishedElement CreateElement(Guid key) =>
        Mock.Of<IPublishedElement>(e => e.Key == key && e.ContentType == Mock.Of<IPublishedContentType>(t => t.Key == TypeKey && t.Alias == "testElement"));
}
