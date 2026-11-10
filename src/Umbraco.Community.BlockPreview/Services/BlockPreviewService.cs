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
            IBlockPreviewViewResolver viewResolver)
        {
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
        /// <param name="tempDataProvider">No longer used.</param>
        /// <param name="viewComponentHelperWrapper">No longer used.</param>
        /// <param name="razorViewEngine">The Razor view engine.</param>
        /// <param name="publishedModelFactory">The published model factory.</param>
        /// <param name="blockEditorConverter">The block editor converter.</param>
        /// <param name="viewComponentSelector">No longer used.</param>
        /// <param name="publishedValueFallback">No longer used.</param>
        /// <param name="options">The block preview options.</param>
        /// <param name="jsonSerializer">The JSON serializer.</param>
        /// <param name="contentTypeService">No longer used.</param>
        /// <param name="dataTypeService">No longer used.</param>
        /// <param name="appCaches">No longer used.</param>
        /// <param name="webHostEnvironment">The web host environment.</param>
        /// <param name="elementTypeCache">No longer used.</param>
        /// <param name="logger">No longer used.</param>
        /// <param name="blockModelFactory">The block model factory.</param>
        /// <param name="blockViewRenderer">The block view renderer.</param>
        /// <param name="blockDataConverter">The block data converter.</param>
        /// <param name="blockTypeCacheService">The block type cache service.</param>
        [Obsolete("Use the constructor with fewer parameters. Several dependencies are no longer used.")]
        public BlockPreviewService(
            ITempDataProvider tempDataProvider,
            IViewComponentHelperWrapper viewComponentHelperWrapper,
            IRazorViewEngine razorViewEngine,
            IPublishedModelFactory publishedModelFactory,
            BlockEditorConverter blockEditorConverter,
            IViewComponentSelector viewComponentSelector,
            IPublishedValueFallback publishedValueFallback,
            IOptions<BlockPreviewOptions> options,
            IJsonSerializer jsonSerializer,
            IContentTypeService contentTypeService,
            IDataTypeService dataTypeService,
            AppCaches appCaches,
            IWebHostEnvironment webHostEnvironment,
            IBlockEditorElementTypeCache elementTypeCache,
            ILogger<BlockPreviewService> logger,
            IBlockModelFactory blockModelFactory,
            IBlockViewRenderer blockViewRenderer,
            IBlockDataConverter blockDataConverter,
            IBlockTypeCacheService blockTypeCacheService)
            : this(
                publishedModelFactory,
                blockEditorConverter,
                options,
                jsonSerializer,
                blockModelFactory,
                blockViewRenderer,
                blockDataConverter,
                blockTypeCacheService,
                StaticServiceProvider.Instance.GetRequiredService<IBlockPreviewViewResolver>())
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewService"/> class.
        /// </summary>
        [Obsolete("Use the constructor that accepts IPublishedModelFactory and IBlockModelFactory instead. This constructor will be removed in a future version.")]
        public BlockPreviewService(
            ITempDataProvider tempDataProvider,
            IViewComponentHelperWrapper viewComponentHelperWrapper,
            IRazorViewEngine razorViewEngine,
            ITypeFinder typeFinder,
            BlockEditorConverter blockEditorConverter,
            IViewComponentSelector viewComponentSelector,
            IPublishedValueFallback publishedValueFallback,
            IOptions<BlockPreviewOptions> options,
            IJsonSerializer jsonSerializer,
            IContentTypeService contentTypeService,
            IDataTypeService dataTypeService,
            AppCaches appCaches,
            IWebHostEnvironment webHostEnvironment,
            IBlockEditorElementTypeCache elementTypeCache,
            ILogger<BlockPreviewService> logger)
            : this(
                StaticServiceProvider.Instance.GetRequiredService<IPublishedModelFactory>(),
                blockEditorConverter,
                options,
                jsonSerializer,
                StaticServiceProvider.Instance.GetRequiredService<IBlockModelFactory>(),
                StaticServiceProvider.Instance.GetRequiredService<IBlockViewRenderer>(),
                StaticServiceProvider.Instance.GetRequiredService<IBlockDataConverter>(),
                StaticServiceProvider.Instance.GetRequiredService<IBlockTypeCacheService>(),
                StaticServiceProvider.Instance.GetRequiredService<IBlockPreviewViewResolver>())
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
        public async Task<string> RenderGridBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
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

            BlockItemData? contentData = blockValue?.BlockValue?.ContentData.FirstOrDefault(x => x.Key == contentGuidParsed);
            if (contentData == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            bool hasNestedBlockGrid = contentData.Values.Any(x => x.EditorAlias == PropertyEditors.Aliases.BlockGrid);

            IPublishedElement? contentElement = _blockDataConverter.ConvertToElement(contentData, content);
            if (contentElement == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockGridItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.BlockGrid,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentData.Key, settingsData?.Key
            ) as BlockGridItem;

            if (blockInstance == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockInstance);

            var layoutItems = blockValue?.BlockValue?.GetLayouts();
            BlockGridLayoutItem? matchingLayout = GetMatchingGridLayout(layoutItems!, blockInstance);

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

            BlockGridConfiguration.BlockGridBlockConfiguration? matchingBlockConfig = config.Blocks.FirstOrDefault(x => x.ContentElementTypeKey == contentData.ContentTypeKey);
            if (matchingBlockConfig == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidMatchingBlockGridConfiguration);

            BlockPreviewContext previewContext = new BlockPreviewContext(
               controllerContext,
               content,
               contentElement.ContentType.Alias,
               BlockType.BlockGrid,
               blockIndex,
               matchingBlockConfig);

            ConfigureBlockInstanceAreas(blockValue!, blockInstance, config, matchingBlockConfig, matchingLayout!, content);

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
        public async Task<string> RenderListBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
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

            BlockItemData? contentData = blockValue?.BlockValue?.ContentData.FirstOrDefault(x => x.Key == contentGuidParsed);
            if (contentData == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            IPublishedElement? contentElement = _blockDataConverter.ConvertToElement(contentData, content);
            if (contentElement == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockListItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.BlockList,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentData.Key, settingsData?.Key
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
        public async Task<string> RenderSingleBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
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

            BlockItemData? contentData = blockValue?.BlockValue?.ContentData.FirstOrDefault(x => x.Key == contentGuidParsed);
            if (contentData == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            IPublishedElement? contentElement = _blockDataConverter.ConvertToElement(contentData, content);
            if (contentElement == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            BlockItemData? settingsData = settingsGuidParsed != Guid.Empty
                ? blockValue?.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == settingsGuidParsed)
                : null;

            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            BlockListItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.SingleBlock,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentData.Key, settingsData?.Key
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
        public async Task<string> RenderRichTextBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext)
        {
            var blockValue = _blockDataConverter.DeserializeRichText(blockData);
            if (blockValue == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidBlockData);

            if (!blockValue.BlockValue.ContentData.Any())
            {
                RichTextEditorBlockDataConverter converter = new RichTextEditorBlockDataConverter(_jsonSerializer);
                converter.TryDeserialize(blockData, out blockValue);
            }

            BlockItemData? contentData = blockValue?.BlockValue?.ContentData.FirstOrDefault();
            if (contentData == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            IPublishedElement? contentElement = _blockDataConverter.ConvertToElement(contentData, content);
            if (contentElement == null)
                return string.Format(Constants.ErrorMessages.ErrorTemplate, Constants.ErrorMessages.InvalidContentData);

            BlockItemData? settingsData = blockValue?.BlockValue.SettingsData.FirstOrDefault();
            IPublishedElement? settingsElement = settingsData != null ? _blockDataConverter.ConvertToElement(settingsData, content) : default;

            Type? contentBlockType = FindBlockType(contentElement.ContentType);
            Type? settingsBlockType = settingsElement != null ? FindBlockType(settingsElement.ContentType) : default;

            if (contentBlockType == null || (settingsElement != null && settingsBlockType == null))
                return GetNoModelsErrorMessage();

            RichTextBlockItem? blockInstance = _blockModelFactory.CreateBlockInstance(
                BlockType.RichText,
                contentBlockType, contentElement,
                settingsBlockType, settingsElement,
                contentData.Key, settingsData?.Key
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

        /// <inheritdoc/>
        [Obsolete("Use the overload without blockEditorAlias and documentTypeUnique parameters.")]
        public Task<string> RenderRichTextBlock(
            string blockData,
            IPublishedContent content,
            ControllerContext controllerContext,
            string blockEditorAlias,
            Guid documentTypeUnique)
            => RenderRichTextBlock(blockData, content, controllerContext);

        /// <summary>
        /// Retrieves the path to the stylesheet associated with the specified block type.
        /// </summary>
        /// <remarks>The method returns a stylesheet path based on the block type. This method is obsolete; use <see cref="GetStylesheetPaths"/> instead.</remarks>
        /// <param name="blockType">The type of block for which the stylesheet path is requested.</param>
        /// <param name="content">The content associated with the block.</param>
        /// <param name="controllerContext">The context of the controller handling the request.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the stylesheet path as a string,
        /// or <see langword="null"/> if no stylesheet is associated with the specified block type.</returns>
        [Obsolete("Use GetStylesheetPaths instead to support multiple stylesheets.")]
        public virtual async Task<string?> GetStylesheetPath(BlockType blockType, IPublishedContent content, ControllerContext controllerContext)
        {
            var paths = await GetStylesheetPaths(blockType, content, controllerContext);
            return paths?.FirstOrDefault();
        }

        /// <summary>
        /// Retrieves the paths to the stylesheets associated with the specified block type.
        /// </summary>
        /// <remarks>The method returns stylesheet paths based on the block type, combining both the legacy Stylesheet property and the new Stylesheets collection.</remarks>
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

            // Add legacy single stylesheet if specified
#pragma warning disable CS0618 // Type or member is obsolete
            if (!string.IsNullOrWhiteSpace(settings.Stylesheet))
                stylesheets.Add(settings.Stylesheet);
#pragma warning restore CS0618 // Type or member is obsolete

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

        private BlockGridLayoutItem? GetMatchingGridLayout(IEnumerable<BlockGridLayoutItem> layoutItems, BlockGridItem? blockInstance)
        {
            if (layoutItems == null || blockInstance == null)
                return null;

            foreach (var layoutItem in layoutItems)
            {
                if (layoutItem.ContentKey == blockInstance.ContentKey)
                {
                    blockInstance.RowSpan = layoutItem.RowSpan ?? 1;
                    blockInstance.ColumnSpan = layoutItem.ColumnSpan ?? 12;
                    return layoutItem;
                }
                else
                {
                    foreach (var area in layoutItem.Areas)
                    {
                        foreach (var item in area.Items)
                        {
                            if (item.ContentKey != blockInstance.ContentKey) continue;
                            blockInstance.RowSpan = item.RowSpan ?? 1;
                            blockInstance.ColumnSpan = item.ColumnSpan ?? layoutItem.ColumnSpan ?? 12;
                            return layoutItem;
                        }
                    }
                }
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
        /// Override this method to customize the view data for block previews asynchronously.
        /// The default implementation calls the synchronous <see cref="CreateViewData"/> method for backward compatibility.
        /// </remarks>
        protected virtual Task<ViewDataDictionary> CreateViewDataAsync(object? typedBlockInstance, BlockPreviewContext context, bool? hasNestedBlockGrid = false)
        {
#pragma warning disable CS0618 // Type or member is obsolete
            return Task.FromResult(CreateViewData(typedBlockInstance, context, hasNestedBlockGrid));
#pragma warning restore CS0618
        }

        /// <summary>
        /// Creates and initializes a <see cref="ViewDataDictionary"/> for use in rendering a block preview.
        /// </summary>
        /// <param name="typedBlockInstance">The typed block instance to be set as the model in the view data. Can be <see langword="null"/>.</param>
        /// <param name="context">The context containing information about the block being previewed.</param>
        /// <param name="hasNestedBlockGrid">Indicates whether the block contains a nested block grid.</param>
        /// <returns>A <see cref="ViewDataDictionary"/> containing the model and additional metadata for rendering the block
        /// preview.</returns>
        [Obsolete("Use CreateViewDataAsync instead. This method will be removed in a future version.")]
        protected virtual ViewDataDictionary CreateViewData(object? typedBlockInstance, BlockPreviewContext context, bool? hasNestedBlockGrid = false)
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

            return viewData;
        }


        private async Task<string> GetMarkup(BlockPreviewContext context)
        {
            // Try custom view resolution first (via virtual GetViewResult for extensibility)
            var viewResult = GetViewResult(context);
            return await _blockViewRenderer.RenderAsync(context, viewResult);
        }

        private void ConfigureBlockInstanceAreas(
            BlockEditorData<BlockGridValue, BlockGridLayoutItem> blockValue,
            BlockGridItem blockInstance,
            BlockGridConfiguration config,
            BlockGridConfiguration.BlockGridBlockConfiguration matchingBlock,
            BlockGridLayoutItem layoutItem,
            IPublishedContent content)
        {
            var gridColumns = config.GridColumns ?? 12;
            blockInstance.AreaGridColumns = matchingBlock.AreaGridColumns ?? 12;
            blockInstance.GridColumns = gridColumns;

            var blockConfigAreaMap = matchingBlock.Areas.ToDictionary(area => area.Key);
            if (layoutItem == null || blockConfigAreaMap == null || !blockConfigAreaMap.Any())
                return;

            blockInstance.Areas = layoutItem.Areas.Select(area =>
            {
                if (!blockConfigAreaMap.TryGetValue(area.Key, out var areaConfig))
                    return null;

                var items = area.Items.Select(item =>
                {
                    BlockItemData? areaContentData = blockValue.BlockValue?.ContentData.FirstOrDefault(x => x.Key == item.ContentKey);
                    IPublishedElement? areaContentElement = _blockDataConverter.ConvertToElement(areaContentData!, content);

                    BlockItemData? areaSettingsData = blockValue.BlockValue?.SettingsData.FirstOrDefault(x => x.Key == item.ContentKey);
                    IPublishedElement? areaSettingsElement = areaSettingsData != null ? _blockDataConverter.ConvertToElement(areaSettingsData, content) : default;

                    var gridItem = new BlockGridItem(item.ContentKey, areaContentElement!, item.SettingsKey, areaSettingsElement!);
                    gridItem.RowSpan = item.RowSpan ?? 1;
                    gridItem.ColumnSpan = item.ColumnSpan ?? areaConfig.ColumnSpan ?? 12;

                    // As in Umbraco's own block grid model, an item at any depth gets the root grid's columns and the
                    // AreaGridColumns of its own block configuration (not the outer block's).
                    var childBlockConfig = config.Blocks.FirstOrDefault(x => x.ContentElementTypeKey == areaContentData?.ContentTypeKey);
                    gridItem.AreaGridColumns = childBlockConfig?.AreaGridColumns ?? 12;
                    gridItem.GridColumns = gridColumns;
                    return gridItem;
                }).WhereNotNull().ToList();

                return new BlockGridArea(items, areaConfig.Alias!, areaConfig.RowSpan ?? 1, areaConfig.ColumnSpan ?? 12);
            }).WhereNotNull().ToArray();
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