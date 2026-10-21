using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Cache.PropertyEditors;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.Editors;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Infrastructure.Serialization;
using Umbraco.Community.BlockPreview.Interfaces;
using static Umbraco.Cms.Core.Constants;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Service for converting and formatting block data.
    /// </summary>
    public class BlockDataConverter : IBlockDataConverter
    {
        private readonly BlockEditorConverter _blockEditorConverter;
        private readonly IJsonSerializer _jsonSerializer;
        private readonly ILogger<BlockDataConverter> _logger;
        private readonly PropertyEditorCollection _propertyEditors;
        private readonly IDataTypeConfigurationCache _dataTypeConfigurationCache;
        private readonly BlockEditorValues<BlockGridValue, BlockGridLayoutItem> _blockGridEditorValues;
        private readonly BlockEditorValues<BlockListValue, BlockListLayoutItem> _blockListEditorValues;
        private readonly BlockEditorValues<RichTextBlockValue, RichTextBlockLayoutItem> _richTextBlockEditorValues;
        private readonly BlockEditorValues<SingleBlockValue, SingleBlockLayoutItem> _singleBlockEditorValues;
        private readonly JsonSerializerOptions _jsonSerializerOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockDataConverter"/> class.
        /// </summary>
        /// <param name="blockEditorConverter">The block editor converter.</param>
        /// <param name="jsonSerializer">The JSON serializer.</param>
        /// <param name="elementTypeCache">The block editor element type cache.</param>
        /// <param name="logger">The logger.</param>
        /// <param name="propertyEditors">The property editor collection.</param>
        /// <param name="dataTypeConfigurationCache">The data type configuration cache.</param>
        public BlockDataConverter(
            BlockEditorConverter blockEditorConverter,
            IJsonSerializer jsonSerializer,
            IBlockEditorElementTypeCache elementTypeCache,
            ILogger<BlockDataConverter> logger,
            PropertyEditorCollection propertyEditors,
            IDataTypeConfigurationCache dataTypeConfigurationCache)
        {
            _blockEditorConverter = blockEditorConverter;
            _jsonSerializer = jsonSerializer;
            _logger = logger;
            _propertyEditors = propertyEditors;
            _dataTypeConfigurationCache = dataTypeConfigurationCache;

            _blockGridEditorValues = new BlockEditorValues<BlockGridValue, BlockGridLayoutItem>(
                new BlockGridEditorDataConverter(jsonSerializer), elementTypeCache, logger);
            _blockListEditorValues = new BlockEditorValues<BlockListValue, BlockListLayoutItem>(
                new BlockListEditorDataConverter(jsonSerializer), elementTypeCache, logger);
            _richTextBlockEditorValues = new BlockEditorValues<RichTextBlockValue, RichTextBlockLayoutItem>(
                new RichTextEditorBlockDataConverter(jsonSerializer), elementTypeCache, logger);
            _singleBlockEditorValues = new BlockEditorValues<SingleBlockValue, SingleBlockLayoutItem>(
                new SingleBlockEditorDataConverter(jsonSerializer), elementTypeCache, logger);

            _jsonSerializerOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                Converters =
                {
                    new JsonStringEnumConverter(),
                    new JsonUdiConverter(),
                    new JsonUdiRangeConverter(),
                    new JsonObjectConverter(),
                    new JsonBlockValueConverter()
                }
            };
        }

        /// <inheritdoc/>
        public BlockEditorData<BlockGridValue, BlockGridLayoutItem>? DeserializeBlockGrid(string? blockData)
            => _blockGridEditorValues.DeserializeAndClean(blockData);

        /// <inheritdoc/>
        public BlockEditorData<BlockListValue, BlockListLayoutItem>? DeserializeBlockList(string? blockData)
            => _blockListEditorValues.DeserializeAndClean(blockData);

        /// <inheritdoc/>
        public BlockEditorData<RichTextBlockValue, RichTextBlockLayoutItem>? DeserializeRichText(string? blockData)
            => _richTextBlockEditorValues.DeserializeAndClean(blockData);

        /// <inheritdoc/>
        public BlockEditorData<SingleBlockValue, SingleBlockLayoutItem>? DeserializeSingleBlock(string? blockData)
            => _singleBlockEditorValues.DeserializeAndClean(blockData);

        /// <inheritdoc/>
        public IPublishedElement ConvertToElement(BlockItemData data, IPublishedElement owner)
        {
            if (data != null)
            {
                for (int i = 0; i < data.Values.Count(); i++)
                {
                    var property = data.Values.ElementAt(i);
                    var value = property.Value;
                    string? propertyAsString = value?.ToString();

                    if (property.EditorAlias == PropertyEditors.Aliases.RichText)
                    {
                        if (RichTextPropertyEditorHelper.TryParseRichTextEditorValue(value, _jsonSerializer, _logger, out RichTextEditorValue? richTextEditorValue))
                        {
                            var blockValue = _richTextBlockEditorValues.DeserializeAndClean(_jsonSerializer.Serialize(richTextEditorValue.Blocks));
                            if (blockValue != null)
                            {
                                FormatBlockData(blockValue.BlockValue.ContentData);
                                FormatBlockData(blockValue.BlockValue.SettingsData);

                                richTextEditorValue.Blocks = blockValue.BlockValue;

                                property.Value = JsonSerializer.Serialize(richTextEditorValue, _jsonSerializerOptions);
                            }
                        }
                    }
                    else if (property.EditorAlias == PropertyEditors.Aliases.BlockGrid)
                    {
                        var blockValue = _blockGridEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            property.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }
                    else if (property.EditorAlias == PropertyEditors.Aliases.BlockList)
                    {
                        var blockValue = _blockListEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            property.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }
                    else if (property.EditorAlias == PropertyEditors.Aliases.SingleBlock)
                    {
                        var blockValue = _singleBlockEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            property.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }
                    else
                    {
                        ConvertPropertyValue(property);
                    }
                }
            }

            var element = _blockEditorConverter.ConvertToElement(owner, data!, PropertyCacheLevel.None, preview: true);
            if (element == null)
                throw new InvalidOperationException($"Unable to find Element {data?.ContentTypeAlias}");

            return element;
        }

        /// <inheritdoc/>
        public void FormatBlockData(List<BlockItemData>? blockData)
        {
            if (blockData == null || blockData.Count == 0)
                return;

            foreach (var contentData in blockData)
            {
                foreach (var propertyData in contentData.Values)
                {
                    if (propertyData.EditorAlias == PropertyEditors.Aliases.RichText)
                    {
                        if (RichTextPropertyEditorHelper.TryParseRichTextEditorValue(propertyData.Value, _jsonSerializer, _logger, out RichTextEditorValue? richTextEditorValue))
                        {
                            var blockValue = _richTextBlockEditorValues.DeserializeAndClean(_jsonSerializer.Serialize(richTextEditorValue.Blocks));
                            if (blockValue != null)
                            {
                                FormatBlockData(blockValue.BlockValue.ContentData);
                                FormatBlockData(blockValue.BlockValue.SettingsData);

                                richTextEditorValue.Blocks = blockValue.BlockValue;

                                propertyData.Value = JsonSerializer.Serialize(richTextEditorValue, _jsonSerializerOptions);

                                propertyData.Value = propertyData.Value.ToString()?.Replace("\"Layout\"", "\"layout\"");
                            }
                        }
                    }

                    else if (propertyData.EditorAlias == PropertyEditors.Aliases.BlockGrid)
                    {
                        string? propertyAsString = propertyData.Value?.ToString();
                        var blockValue = _blockGridEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            propertyData.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }

                    else if (propertyData.EditorAlias == PropertyEditors.Aliases.BlockList)
                    {
                        string? propertyAsString = propertyData.Value?.ToString();
                        var blockValue = _blockListEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            propertyData.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }

                    else if (propertyData.EditorAlias == PropertyEditors.Aliases.SingleBlock)
                    {
                        string? propertyAsString = propertyData.Value?.ToString();
                        var blockValue = _singleBlockEditorValues.DeserializeAndClean(propertyAsString);
                        if (blockValue != null)
                        {
                            FormatBlockData(blockValue.BlockValue.ContentData);
                            FormatBlockData(blockValue.BlockValue.SettingsData);
                            propertyData.Value = JsonSerializer.Serialize(blockValue.BlockValue, _jsonSerializerOptions);
                        }
                    }

                    else ConvertPropertyValue(propertyData);
                }
            }
        }

        /// <summary>
        /// Converts a property value from its editor format to its database/intermediate format
        /// using the CMS property editor's FromEditor method.
        /// </summary>
        private void ConvertPropertyValue(BlockPropertyValue propertyData)
        {
            if (propertyData.PropertyType is null || propertyData.EditorAlias is null)
                return;

            if (!_propertyEditors.TryGet(propertyData.EditorAlias, out var editor))
            {
                _logger.LogDebug(
                    "BlockPreview: No property editor found for alias '{EditorAlias}', skipping conversion",
                    [propertyData.EditorAlias]);
                return;
            }

            var originalValue = propertyData.Value;
            var originalType = originalValue?.GetType().Name ?? "null";

            try
            {
                var config = _dataTypeConfigurationCache.GetConfiguration(propertyData.PropertyType.DataTypeKey);
                var editorValue = new ContentPropertyData(propertyData.Value, config);
                var valueEditor = editor.GetValueEditor();

                propertyData.Value = valueEditor.FromEditor(editorValue, null);

                var newType = propertyData.Value?.GetType().Name ?? "null";

                if (propertyData.Value is null && originalValue is not null)
                {
                    _logger.LogWarning(
                        "BlockPreview: FromEditor returned null for property '{EditorAlias}' (was {originalType}). Original value: {originalValue}",
                        [propertyData.EditorAlias, originalType, originalValue?.ToString()?[..Math.Min(originalValue.ToString()!.Length, 200)]]);
                }
                else if (originalType != newType)
                {
                    _logger.LogDebug(
                        "BlockPreview: FromEditor converted '{EditorAlias}' from {originalType} to {newType}",
                        [propertyData.EditorAlias, originalType, newType]);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex,
                    "BlockPreview: FromEditor threw for property '{EditorAlias}' ({originalType}). Keeping original value",
                    [propertyData.EditorAlias, originalType]
                    );
                propertyData.Value = originalValue;
            }
        }
    }
}
