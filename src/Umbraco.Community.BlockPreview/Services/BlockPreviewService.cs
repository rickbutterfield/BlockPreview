using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Cache.PropertyEditors;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Extensions;
using static Umbraco.Cms.Core.Constants;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Service for rendering block previews.
    /// </summary>
    public class BlockPreviewService : IBlockPreviewService
    {
        private readonly BlockPreviewOptions _options;
        private readonly BlockEditorConverter _blockEditorConverter;
        private readonly IJsonSerializer _jsonSerializer;
        private readonly IBlockModelFactory _blockModelFactory;
        private readonly IBlockViewRenderer _blockViewRenderer;
        private readonly IBlockDataConverter _blockDataConverter;
        private readonly IBlockTypeCacheService _blockTypeCacheService;
        private readonly IBlockPreviewViewResolver _viewResolver;
        private readonly IExternalElementResolver _externalElementResolver;
        private readonly bool _hasModelFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewService"/> class.
        /// </summary>
        /// <param name="publishedModelFactory">The published model factory.</param>
        /// <param name="blockEditorConverter">The block editor converter.</param>
        /// <param name="options">The block preview options.</param>
        /// <param name="jsonSerializer">The JSON serializer.</param>
        /// <param name="blockModelFactory">The block model factory.</param>
        /// <param name="blockViewRenderer">The block view renderer.</param>
        /// <param name="blockDataConverter">The block data converter.</param>
        /// <param name="blockTypeCacheService">The block type cache service.</param>
        /// <param name="viewResolver">The view resolver.</param>
        /// <param name="externalElementResolver">The resolver for Library (external) elements.</param>
        [ActivatorUtilitiesConstructor]
        public BlockPreviewService(
            IPublishedModelFactory publishedModelFactory,
            BlockEditorConverter blockEditorConverter,
            IOptions<BlockPreviewOptions> options,
            IJsonSerializer jsonSerializer,
            IBlockModelFactory blockModelFactory,
            IBlockViewRenderer blockViewRenderer,
            IBlockDataConverter blockDataConverter,
            IBlockTypeCacheService blockTypeCacheService,
            IBlockPreviewViewResolver viewResolver,
            IExternalElementResolver externalElementResolver)
        {
            _externalElementResolver = externalElementResolver;
            _blockEditorConverter = blockEditorConverter;
            _options = options.Value;
            _jsonSerializer = jsonSerializer;
            _blockModelFactory = blockModelFactory;
            _blockViewRenderer = blockViewRenderer;
            _blockDataConverter = blockDataConverter;
            _blockTypeCacheService = blockTypeCacheService;
            _viewResolver = viewResolver;
            _hasModelFactory = publishedModelFactory is not NoopPublishedModelFactory;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewService"/> class.
        /// </summary>
        /// <param name="publishedModelFactory">The published model factory.</param>
        /// <param name="blockEditorConverter">The block editor converter.</param>
        /// <param name="options">The block preview options.</param>
        /// <param name="jsonSerializer">The JSON serializer.</param>
        /// <param name="blockModelFactory">The block model factory.</param>
        /// <param name="blockViewRenderer">The block view renderer.</param>
        /// <param name="blockDataConverter">The block data converter.</param>
        /// <param name="blockTypeCacheService">The block type cache service.</param>
        /// <param name="viewResolver">The view resolver.</param>
        [Obsolete("Use the constructor that takes an IExternalElementResolver. Scheduled for removal in v9.")]
        public BlockPreviewService(
            IPublishedModelFactory publishedModelFactory,
            BlockEditorConverter blockEditorConverter,
            IOptions<BlockPreviewOptions> options,
            IJsonSerializer jsonSerializer,
            IBlockModelFactory blockModelFactory,
            IBlockViewRenderer blockViewRenderer,
            IBlockDataConverter blockDataConverter,
            IBlockTypeCacheService blockTypeCacheService,
            IBlockPreviewViewResolver viewResolver)
            : this(
                publishedModelFactory,
                blockEditorConverter,
                options,
                jsonSerializer,
                blockModelFactory,
                blockViewRenderer,
                blockDataConverter,
                blockTypeCacheService,
                viewResolver,
                StaticServiceProvider.Instance.GetRequiredService<IExternalElementResolver>())
        {
        }

        #region Public
        /// <summary>
        /// Renders a block grid block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public Task<string> RenderGridBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
            => RenderGridBlock(blockData, content, controllerContext, new BlockRenderOptions(), blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a block grid block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public async Task<string> RenderGridBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            BlockRenderOptions options,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
        {
            BlockEditorData<BlockGridValue, BlockGridLayoutItem>? blockValue = _blockDataConverter.DeserializeBlockGrid(blockData);
            if (blockValue == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockData);

            if (!blockValue.BlockValue.ContentData.Any())
            {
                BlockGridEditorDataConverter converter = new BlockGridEditorDataConverter(_jsonSerializer);
                converter.TryDeserialize(blockData, out blockValue);
            }

            if (!Guid.TryParse(contentKey, out Guid contentGuidParsed))
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentKey);

            Guid.TryParse(settingsKey!, out Guid settingsGuidParsed);

            var layoutItems = blockValue?.BlockValue?.GetLayouts();
            IBlockLayoutItem? foundLayoutItem = FindLayoutItem(layoutItems, options.LayoutKey, contentGuidParsed);
            ResolvedContent resolved = await ResolveContentAsync(
                foundLayoutItem,
                blockValue?.BlockValue?.ContentData, contentGuidParsed, content, options.OwningPropertyCulture);
            if (resolved.Element == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, resolved.Error);

            // A Library element has no content data; its element's own properties say whether it holds a block grid.
            BlockItemData? contentData = resolved.Data;
            IPublishedElement contentElement = resolved.Element;
            bool hasNestedBlockGrid = contentData != null
                ? contentData.Values.Any(x => x.EditorAlias == PropertyEditors.Aliases.BlockGrid)
                : contentElement.Properties.Any(x => x.PropertyType.EditorAlias == PropertyEditors.Aliases.BlockGrid);

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content, options.OwningPropertyCulture) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockGridItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.BlockGrid,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentElement.Key, settingsData?.Key
            ) as BlockGridItem;

            if (blockInstance == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockInstance);

            IContentType? documentType = await _blockTypeCacheService.GetContentType(documentTypeUnique);
            if (documentType == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidDocumentType);

            IPropertyType? property = documentType.PropertyTypes.FirstOrDefault(x => x.Alias.Equals(blockEditorAlias));
            if (property == null)
            {
                property = documentType.CompositionPropertyTypes.FirstOrDefault(x => x.Alias.Equals(blockEditorAlias));

                if (property == null)
                    return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidPropertyType);
            }

            IDataType? dataType = await _blockTypeCacheService.GetDataType(property.DataTypeKey);
            if (dataType == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidDataType);

            BlockGridConfiguration? config = dataType.ConfigurationAs<BlockGridConfiguration>();
            if (config == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockGridConfiguration);

            BlockGridConfiguration.BlockGridBlockConfiguration? matchingBlockConfig = config.Blocks.FirstOrDefault(x => x.ContentElementTypeKey == (contentData?.ContentTypeKey ?? contentElement.ContentType.Key));
            if (matchingBlockConfig == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidMatchingBlockGridConfiguration);

            BlockPreviewContext previewContext = new BlockPreviewContext(
               controllerContext,
               content,
               contentElement.ContentType.Alias,
               BlockType.BlockGrid,
               blockIndex,
               matchingBlockConfig);

            // The spans fall back to the root grid's columns, so this needs the grid configuration.
            BlockGridLayoutItem? matchingLayout = GetMatchingGridLayout(layoutItems!, blockInstance, config.GridColumns ?? 12, foundLayoutItem);

            await ConfigureBlockInstanceAreasAsync(blockValue!, blockInstance, config, matchingBlockConfig, matchingLayout!, content, options.OwningPropertyCulture);

            previewContext.ViewData = await CreateViewDataAsync(blockInstance, previewContext, hasNestedBlockGrid);
            return await GetMarkup(previewContext);
        }

        /// <summary>
        /// Renders a block list block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public Task<string> RenderListBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
            => RenderListBlock(blockData, content, controllerContext, new BlockRenderOptions(), blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a block list block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public async Task<string> RenderListBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            BlockRenderOptions options,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
        {
            var blockValue = _blockDataConverter.DeserializeBlockList(blockData);
            if (blockValue == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockData);

            if (!blockValue.BlockValue.ContentData.Any())
            {
                BlockListEditorDataConverter converter = new BlockListEditorDataConverter(_jsonSerializer);
                converter.TryDeserialize(blockData, out blockValue);
            }

            if (!Guid.TryParse(contentKey, out Guid contentGuidParsed))
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentKey);

            Guid.TryParse(settingsKey!, out Guid settingsGuidParsed);

            ResolvedContent resolved = await ResolveContentAsync(
                FindLayoutItem(blockValue?.BlockValue?.GetLayouts(), options.LayoutKey, contentGuidParsed),
                blockValue?.BlockValue?.ContentData, contentGuidParsed, content, options.OwningPropertyCulture);
            if (resolved.Element == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, resolved.Error);

            IPublishedElement contentElement = resolved.Element;

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content, options.OwningPropertyCulture) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockListItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.BlockList,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentElement.Key, settingsData?.Key
            ) as BlockListItem;

            if (blockInstance == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockInstance);

            BlockPreviewContext previewContext = new BlockPreviewContext(
               controllerContext,
               content,
               contentElement.ContentType.Alias,
               BlockType.BlockList,
               blockIndex);

            previewContext.ViewData = await CreateViewDataAsync(blockInstance, previewContext);
            return await GetMarkup(previewContext);
        }

        /// <summary>
        /// Renders a single block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public Task<string> RenderSingleBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
            => RenderSingleBlock(blockData, content, controllerContext, new BlockRenderOptions(), blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a single block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        public async Task<string> RenderSingleBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            BlockRenderOptions options,
            string blockEditorAlias = "",
            Guid documentTypeUnique = default,
            string contentKey = "",
            string? settingsKey = default,
            int? blockIndex = 0)
        {
            var blockValue = _blockDataConverter.DeserializeSingleBlock(blockData);
            if (blockValue == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockData);

            if (!blockValue.BlockValue.ContentData.Any())
            {
                SingleBlockEditorDataConverter converter = new SingleBlockEditorDataConverter(_jsonSerializer);
                converter.TryDeserialize(blockData, out blockValue);
            }

            if (!Guid.TryParse(contentKey, out Guid contentGuidParsed))
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentKey);

            Guid.TryParse(settingsKey!, out Guid settingsGuidParsed);

            ResolvedContent resolved = await ResolveContentAsync(
                FindLayoutItem(blockValue?.BlockValue?.GetLayouts(), options.LayoutKey, contentGuidParsed),
                blockValue?.BlockValue?.ContentData, contentGuidParsed, content, options.OwningPropertyCulture);
            if (resolved.Element == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, resolved.Error);

            IPublishedElement contentElement = resolved.Element;

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content, options.OwningPropertyCulture) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockListItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.SingleBlock,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentElement.Key, settingsData?.Key
            ) as BlockListItem;

            if (blockInstance == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockInstance);

            BlockPreviewContext previewContext = new BlockPreviewContext(
               controllerContext,
               content,
               contentElement.ContentType.Alias,
               BlockType.SingleBlock,
               blockIndex);

            previewContext.ViewData = await CreateViewDataAsync(blockInstance, previewContext);
            return await GetMarkup(previewContext);
        }

        /// <summary>
        /// Renders a rich text block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>The rendered HTML.</returns>
        public Task<string> RenderRichTextBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext)
            => RenderRichTextBlock(blockData, content, controllerContext, new BlockRenderOptions());

        /// <summary>
        /// Renders a rich text block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <returns>The rendered HTML.</returns>
        public async Task<string> RenderRichTextBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            BlockRenderOptions options)
        {
            var blockValue = _blockDataConverter.DeserializeRichText(blockData);
            if (blockValue == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockData);

            if (!blockValue.BlockValue.ContentData.Any())
            {
                RichTextEditorBlockDataConverter converter = new RichTextEditorBlockDataConverter(_jsonSerializer);
                converter.TryDeserialize(blockData, out blockValue);
            }

            // The value holds one block: a local one in ContentData, or a Library element that only has a layout item.
            BlockItemData? localContentData = blockValue?.BlockValue?.ContentData.FirstOrDefault();
            IBlockLayoutItem? layoutItem = localContentData != null
                ? FindLayoutItem(blockValue?.BlockValue?.GetLayouts(), options.LayoutKey, localContentData.Key)
                : FindLayoutItem(blockValue?.BlockValue?.GetLayouts()?.Where(x => x.IsExternalContent), options.LayoutKey, Guid.Empty)
                    ?? blockValue?.BlockValue?.GetLayouts()?.FirstOrDefault(x => x.IsExternalContent);

            ResolvedContent resolved = await ResolveContentAsync(
                layoutItem, blockValue?.BlockValue?.ContentData, layoutItem?.ContentKey ?? localContentData?.Key ?? Guid.Empty,
                content, options.OwningPropertyCulture);
            if (resolved.Element == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, resolved.Error);

            IPublishedElement contentElement = resolved.Element;

            BlockItemData? settingsData = blockValue?.BlockValue.SettingsData.FirstOrDefault();
            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content, options.OwningPropertyCulture) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            RichTextBlockItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.RichText,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentElement.Key, settingsData?.Key
            ) as RichTextBlockItem;

            if (blockInstance == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockInstance);

            BlockPreviewContext previewContext = new BlockPreviewContext(
                controllerContext,
                content,
                contentElement.ContentType.Alias,
                BlockType.RichText);

            previewContext.ViewData = await CreateViewDataAsync(blockInstance, previewContext);
            return await GetMarkup(previewContext);
        }

        /// <summary>
        /// Retrieves the paths to the stylesheets associated with the specified block type.
        /// </summary>
        /// <remarks>The method returns stylesheet paths based on the block type, from the Stylesheets collection.</remarks>
        /// <param name="blockType">The type of block for which the stylesheet paths are requested.</param>
        /// <param name="content">The content associated with the block.</param>
        /// <param name="controllerContext">The context of the controller handling the request.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains a list of stylesheet paths.
        /// Returns an empty collection if no stylesheets are associated with the specified block type.</returns>
        public virtual Task<IReadOnlyList<string>> GetStylesheetPaths(BlockType blockType, IPublishedContent content, ControllerContext controllerContext)
        {
            BlockTypeSettings? settings = blockType switch
            {
                BlockType.BlockGrid => _options.BlockGrid,
                BlockType.BlockList => _options.BlockList,
                BlockType.RichText => _options.RichText,
                BlockType.SingleBlock => _options.SingleBlock,
                _ => null
            };

            if (settings == null)
                return Task.FromResult<IReadOnlyList<string>>([]);

            var stylesheets = new List<string>();


            // Add multiple stylesheets if specified
            if (settings.Stylesheets?.Any() == true)
                stylesheets.AddRange(settings.Stylesheets.Where(s => !string.IsNullOrWhiteSpace(s)));

            // Return distinct stylesheets to avoid duplicates
            return Task.FromResult<IReadOnlyList<string>>(stylesheets.Distinct().ToList());
        }
        #endregion

        #region Private
        private Type? FindBlockType(IPublishedContentType? contentType)
        {
            if (contentType == null)
                return null;

            var type = _blockEditorConverter.GetModelType(contentType.Key);

            // GetModelType returns typeof(IPublishedElement) when no model exists
            return type == typeof(IPublishedElement) ? null : type;
        }

        private string GetNoModelsErrorMessage()
        {
            var errorMessage = _hasModelFactory
                ? Constants.ErrorMessages.NoGeneratedModels
                : Constants.ErrorMessages.ModelsNotConfigured;

            return string.Format(Constants.ErrorMessages.WarningTemplate, errorMessage);
        }

        private sealed record ResolvedContent(BlockItemData? Data, IPublishedElement? Element, string? Error);

        /// <summary>
        /// The key that identifies a layout item. Layout items stored before Umbraco 19 have no key of their own, and
        /// Umbraco gives them their content key when it loads them.
        /// </summary>
        private static Guid EffectiveKey(IBlockLayoutItem layoutItem)
            => layoutItem.Key == Guid.Empty ? layoutItem.ContentKey : layoutItem.Key;

        /// <summary>
        /// Finds the layout item of one block instance among the root items and their direct children (the area items of a
        /// block grid), the two levels Umbraco's <c>GetContainedLayouts</c> reaches. The layout key identifies it: the same content key can
        /// appear several times in one layout. Without a layout key (or when none matches) the first item with the content key wins.
        /// </summary>
        internal static IBlockLayoutItem? FindLayoutItem(IEnumerable<IBlockLayoutItem>? layoutItems, Guid? layoutKey, Guid contentKey)
        {
            if (layoutItems == null)
                return null;

            List<IBlockLayoutItem> all = layoutItems.SelectMany(x => new[] { x }.Concat(x.GetContainedLayouts())).ToList();

            if (layoutKey.HasValue && layoutKey.Value != Guid.Empty)
            {
                IBlockLayoutItem? byKey = all.FirstOrDefault(x => EffectiveKey(x) == layoutKey.Value);
                if (byKey != null)
                    return byKey;
            }

            return all.FirstOrDefault(x => x.ContentKey == contentKey);
        }

        /// <summary>
        /// Resolves the content element of a block: a Library element through the element cache when its layout item is
        /// external (it has no content data), otherwise the block's own content data converted to an element.
        /// </summary>
        private async Task<ResolvedContent> ResolveContentAsync(
            IBlockLayoutItem? layoutItem,
            IEnumerable<BlockItemData>? contentData,
            Guid contentKey,
            IPublishedContent content,
            string? owningPropertyCulture)
        {
            if (layoutItem?.IsExternalContent == true)
            {
                ExternalElementResult external = await _externalElementResolver.ResolveAsync(layoutItem.ContentKey);
                return external.Status switch
                {
                    ExternalElementStatus.Success when external.Element != null => new ResolvedContent(null, external.Element, null),
                    ExternalElementStatus.NotPermitted => new ResolvedContent(null, null, Constants.ErrorMessages.ExternalElementNotPermitted),
                    _ => new ResolvedContent(null, null, Constants.ErrorMessages.ExternalElementNotFound)
                };
            }

            BlockItemData? data = contentData?.FirstOrDefault(x => x.Key == contentKey);
            if (data == null)
                return new ResolvedContent(null, null, Constants.ErrorMessages.InvalidContentData);

            IPublishedElement? element = _blockDataConverter.ConvertToElement(data, content, owningPropertyCulture);
            return element == null
                ? new ResolvedContent(data, null, Constants.ErrorMessages.InvalidContentData)
                : new ResolvedContent(data, element, null);
        }

        /// <summary>
        /// Copies the spans of the previewed block's layout item onto the block and returns the root layout item it sits in.
        /// As in Umbraco's own block grid model, a block without a stored span gets the root grid's columns
        /// (<paramref name="gridColumns"/>), at any depth.
        /// </summary>
        /// <param name="layoutItems">The root layout items.</param>
        /// <param name="blockInstance">The block to copy the spans onto.</param>
        /// <param name="gridColumns">The root grid's columns.</param>
        /// <param name="layoutItem">The layout item of the block, as <see cref="FindLayoutItem"/> found it; when
        /// <c>null</c> the first item with the block's content key is used.</param>
        private BlockGridLayoutItem? GetMatchingGridLayout(IEnumerable<BlockGridLayoutItem> layoutItems, BlockGridItem? blockInstance, int gridColumns, IBlockLayoutItem? layoutItem = null)
        {
            if (layoutItems == null || blockInstance == null)
                return null;

            IBlockLayoutItem? found = layoutItem ?? FindLayoutItem(layoutItems, null, blockInstance.ContentKey);
            if (found == null)
                return null;

            foreach (var root in layoutItems)
            {
                BlockGridLayoutItem? matched = ReferenceEquals(root, found)
                    ? root
                    : root.GetContainedLayouts().OfType<BlockGridLayoutItem>().FirstOrDefault(x => ReferenceEquals(x, found));
                if (matched == null)
                    continue;

                blockInstance.RowSpan = matched.RowSpan ?? 1;
                blockInstance.ColumnSpan = matched.ColumnSpan ?? gridColumns;
                return root;
            }

            return null;
        }

        /// <summary>
        /// Creates and initializes a <see cref="ViewDataDictionary"/> for use in rendering a block preview.
        /// </summary>
        /// <param name="typedBlockInstance">The typed block instance to be set as the model in the view data. Can be <see langword="null"/>.</param>
        /// <param name="context">The context containing information about the block being previewed.</param>
        /// <param name="hasNestedBlockGrid">Indicates whether the block contains a nested block grid.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains a <see cref="ViewDataDictionary"/>
        /// containing the model and additional metadata for rendering the block preview.</returns>
        /// <remarks>
        /// Override this method to customize the view data for block previews.
        /// </remarks>
        protected virtual Task<ViewDataDictionary> CreateViewDataAsync(object? typedBlockInstance, BlockPreviewContext context, bool? hasNestedBlockGrid = false)
        {
            var viewData = new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary())
            {
                Model = typedBlockInstance
            };

            viewData["blockPreview"] = true;
            viewData["blockIndex"] = context.BlockIndex;

            if (context.BlockType == BlockType.BlockGrid)
            {
                viewData["blockGridPreview"] = true;

                if (context.BlockGridBlockConfig != null && context.BlockGridBlockConfig.Areas.Any())
                {
                    viewData["matchingBlockConfig"] = context.BlockGridBlockConfig;
                }

                if (hasNestedBlockGrid == true)
                {
                    viewData["blockGridNested"] = hasNestedBlockGrid;
                }
            }

            return Task.FromResult(viewData);
        }


        private async Task<string> GetMarkup(BlockPreviewContext context)
        {
            // Try custom view resolution first (via virtual GetViewResult for extensibility)
            var viewResult = GetViewResult(context);
            return await _blockViewRenderer.RenderAsync(context, viewResult);
        }

        private async Task ConfigureBlockInstanceAreasAsync(
            BlockEditorData<BlockGridValue, BlockGridLayoutItem> blockValue,
            BlockGridItem blockInstance,
            BlockGridConfiguration config,
            BlockGridConfiguration.BlockGridBlockConfiguration matchingBlock,
            BlockGridLayoutItem layoutItem,
            IPublishedContent content,
            string? owningPropertyCulture)
        {
            var gridColumns = config.GridColumns ?? 12;
            // As in Umbraco's model, AreaGridColumns stays null when the block has none configured, so Umbraco's own
            // AreaGridColumns ?? GridColumns ?? 12 expression reaches the root grid's columns.
            blockInstance.AreaGridColumns = matchingBlock.AreaGridColumns;
            blockInstance.GridColumns = gridColumns;

            var blockConfigAreaMap = matchingBlock.Areas.ToDictionary(area => area.Key);
            if (layoutItem == null || blockConfigAreaMap == null || !blockConfigAreaMap.Any())
                return;

            var areas = new List<BlockGridArea>();
            foreach (var area in layoutItem.Areas)
            {
                if (!blockConfigAreaMap.TryGetValue(area.Key, out var areaConfig))
                    continue;

                var items = new List<BlockGridItem>();
                foreach (var item in area.Items)
                {
                    // Resolved per layout item (not per content key), as the same element can sit in several areas.
                    // A layout item can outlive its element (for example when its element type was deleted, or the
                    // Library element was deleted), so skip it rather than fail the whole preview.
                    ResolvedContent resolved = await ResolveContentAsync(
                        item, blockValue.BlockValue?.ContentData, item.ContentKey, content, owningPropertyCulture);
                    if (resolved.Element == null)
                        continue;

                    // Settings data is stored under the layout item's SettingsKey, not its ContentKey.
                    BlockItemData? areaSettingsData = item.SettingsKey.HasValue
                        ? blockValue.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == item.SettingsKey.Value)
                        : null;
                    IPublishedElement? areaSettingsElement = areaSettingsData != null ? _blockDataConverter.ConvertToElement(areaSettingsData, content, owningPropertyCulture) : default;

                    var gridItem = new BlockGridItem(item.ContentKey, resolved.Element, item.SettingsKey, areaSettingsElement!);
                    gridItem.RowSpan = item.RowSpan ?? 1;
                    // As in Umbraco's model, an item without a stored span gets the root grid's columns, at any depth.
                    gridItem.ColumnSpan = item.ColumnSpan ?? gridColumns;

                    // As in Umbraco's own block grid model, an item at any depth gets the root grid's columns and the
                    // AreaGridColumns of its own block configuration (not the outer block's).
                    var childBlockConfig = config.Blocks.FirstOrDefault(x => x.ContentElementTypeKey == (resolved.Data?.ContentTypeKey ?? resolved.Element.ContentType.Key));
                    gridItem.AreaGridColumns = childBlockConfig?.AreaGridColumns;
                    gridItem.GridColumns = gridColumns;
                    items.Add(gridItem);
                }

                // An area without its own span follows the block's AreaGridColumns, then the root grid's columns.
                areas.Add(new BlockGridArea(items, areaConfig.Alias!, areaConfig.RowSpan ?? 1,
                    areaConfig.ColumnSpan ?? matchingBlock.AreaGridColumns ?? gridColumns));
            }

            blockInstance.Areas = areas.ToArray();
        }

        /// <summary>
        /// Attempts to locate a view based on the provided block preview context.
        /// </summary>
        /// <remarks>This method uses the cached view resolver to find views, improving performance
        /// by avoiding repeated file system checks.</remarks>
        /// <param name="context">The context containing information about the block preview, including the content alias and block type.</param>
        /// <returns>A <see cref="ViewEngineResult"/> representing the located view if a matching view is found; otherwise, <see
        /// langword="null"/>.</returns>
        protected virtual ViewEngineResult? GetViewResult(BlockPreviewContext context)
        {
            if (string.IsNullOrEmpty(context.ContentAlias))
                return null;

            return _viewResolver.ResolveView(context.ContentAlias, context.BlockType);
        }
        #endregion
    }
}