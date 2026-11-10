using Umbraco.Community.BlockPreview.Enums;

namespace Umbraco.Community.BlockPreview
{
    /// <summary>
    /// Configuration options for Block Preview.
    /// </summary>
    public class BlockPreviewOptions
    {
        /// <summary>
        /// Gets or sets the settings for Block Grid editors.
        /// </summary>
        public BlockTypeSettings BlockGrid { get; set; }
        
        /// <summary>
        /// Gets or sets the settings for Block List editors.
        /// </summary>
        public BlockTypeSettings BlockList { get; set; }
        
        /// <summary>
        /// Gets or sets the settings for Rich Text editors.
        /// </summary>
        public BlockTypeSettings RichText { get; set; }

        /// <summary>
        /// Gets or sets the settings for Single Block editors.
        /// </summary>
        public BlockTypeSettings SingleBlock { get; set; }

        /// <summary>
        /// Gets the view locations for a specific block type.
        /// </summary>
        /// <param name="blockType">The type of block.</param>
        /// <returns>A list of view locations.</returns>
        public List<string>? GetViewLocations(BlockType blockType)
        {
            var locations = new List<string>();

            if (blockType == BlockType.BlockGrid)
            {
                if (BlockGrid?.ViewLocations?.Any() == true)
                    locations.AddRange(BlockGrid.ViewLocations);

                locations.Add(Constants.DefaultViewLocations.BlockGrid);
            }

            if (blockType == BlockType.BlockList)
            {
                if (BlockList?.ViewLocations?.Any() == true)
                    locations.AddRange(BlockList.ViewLocations);
                
                locations.Add(Constants.DefaultViewLocations.BlockList);
            }

            if (blockType == BlockType.RichText)
            {
                if (RichText?.ViewLocations?.Any() == true)
                    locations.AddRange(RichText.ViewLocations);

                locations.Add(Constants.DefaultViewLocations.RichText);
            }

            if (blockType == BlockType.SingleBlock)
            {
                if (SingleBlock?.ViewLocations?.Any() == true)
                    locations.AddRange(SingleBlock.ViewLocations);

                locations.Add(Constants.DefaultViewLocations.SingleBlock);
            }

            locations = locations.Distinct().ToList();

            return locations;
        }

        /// <summary>
        /// Gets all view locations for all block types.
        /// </summary>
        /// <returns>A list of all view locations.</returns>
        public List<string>? GetAllViewLocations()
        {
            var locations = new List<string>();

            var blockGridLocations = GetViewLocations(BlockType.BlockGrid);
            if (blockGridLocations?.Any() == true)
                locations.AddRange(blockGridLocations);

            var blockListLocations = GetViewLocations(BlockType.BlockList);
            if (blockListLocations?.Any() == true)
                locations.AddRange(blockListLocations);

            var richTextLocations = GetViewLocations(BlockType.RichText);
            if (richTextLocations?.Any() == true)
                locations.AddRange(richTextLocations);

            var singleBlockLocations = GetViewLocations(BlockType.SingleBlock);
            if (singleBlockLocations?.Any() == true)
                locations.AddRange(singleBlockLocations);

            return locations;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewOptions"/> class.
        /// </summary>
        public BlockPreviewOptions()
        {
            BlockGrid = new();
            BlockList = new();
            RichText = new();
            SingleBlock = new();
        }
    }

    /// <summary>
    /// Settings for a specific block type.
    /// </summary>
    public class BlockTypeSettings
    {
        /// <summary>
        /// Gets or sets a value indicating whether this block type is enabled.
        /// </summary>
        public bool Enabled { get; set; } = false;

        /// <summary>
        /// Gets or sets the view locations for this block type.
        /// </summary>
        public List<string>? ViewLocations { get; set; } = [];

        /// <summary>
        /// Gets or sets the content types for this block type.
        /// </summary>
        public List<string>? ContentTypes { get; set; } = [];

        /// <summary>
        /// Gets or sets the content type aliases to exclude from previews.
        /// Only applies when <see cref="ContentTypes"/> is not set.
        /// When configured, previews will be enabled for all element types except those listed here.
        /// </summary>
        public List<string> IgnoredContentTypes { get; set; } = [];

        /// <summary>
        /// Gets or sets the stylesheets for this block type.
        /// </summary>
        public List<string>? Stylesheets { get; set; } = [];
    }
}