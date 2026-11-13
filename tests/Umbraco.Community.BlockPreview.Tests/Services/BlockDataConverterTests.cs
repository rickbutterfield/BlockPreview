using System.Text.Json;
using System.Text.Json.Nodes;
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

[TestFixture]
public class BlockDataConverterTests
{
    private BlockDataConverter _converter = null!;
    private Mock<IDataTypeConfigurationCache> _dataTypeConfigCacheMock = null!;
    private Mock<IDataValueEditor> _valueEditorMock = null!;
    private Mock<ILogger<BlockDataConverter>> _loggerMock = null!;

    private const string TestEditorAlias = "Umbraco.TextBox";
    private const string ImageCropperAlias = "Umbraco.ImageCropper";
    private const string UploadFieldAlias = "Umbraco.UploadField";

    [SetUp]
    public void SetUp()
    {
        var jsonSerializerMock = new Mock<IJsonSerializer>();
        _dataTypeConfigCacheMock = new Mock<IDataTypeConfigurationCache>();
        _valueEditorMock = new Mock<IDataValueEditor>();
        _loggerMock = new Mock<ILogger<BlockDataConverter>>();

        var dataEditors = new[] { TestEditorAlias, ImageCropperAlias, UploadFieldAlias }.Select(alias =>
        {
            var dataEditorMock = new Mock<IDataEditor>();
            dataEditorMock.Setup(e => e.Alias).Returns(alias);
            dataEditorMock.Setup(e => e.GetValueEditor()).Returns(_valueEditorMock.Object);
            return dataEditorMock.Object;
        }).ToArray();

        var dataEditorCollection = new DataEditorCollection(() => dataEditors);
        var propertyEditors = new PropertyEditorCollection(dataEditorCollection);

        _converter = new BlockDataConverter(
            blockEditorConverter: null!,
            jsonSerializerMock.Object,
            Mock.Of<IBlockEditorElementTypeCache>(),
            _loggerMock.Object,
            propertyEditors,
            _dataTypeConfigCacheMock.Object);
    }

    #region Helpers

    private static BlockPropertyValue CreatePropertyValue(
        string? editorAlias, object? value, Guid? dataTypeKey = null)
    {
        var prop = new BlockPropertyValue
        {
            Alias = "testProp",
            Value = value
        };

        if (editorAlias != null)
        {
            var propertyTypeMock = new Mock<IPropertyType>();
            propertyTypeMock.Setup(pt => pt.PropertyEditorAlias).Returns(editorAlias);
            propertyTypeMock.Setup(pt => pt.DataTypeKey).Returns(dataTypeKey ?? Guid.NewGuid());
            prop.PropertyType = propertyTypeMock.Object;
        }

        return prop;
    }

    private static BlockItemData CreateBlockItemData(params BlockPropertyValue[] properties)
    {
        return new BlockItemData(Guid.NewGuid(), Guid.NewGuid(), "testElement")
        {
            Values = properties.ToList()
        };
    }

    #endregion

    #region Null/Empty Guards

    [Test]
    public void FormatBlockData_WithNull_DoesNothing()
    {
        _converter.FormatBlockData(null);

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    [Test]
    public void FormatBlockData_WithEmptyList_DoesNothing()
    {
        _converter.FormatBlockData(new List<BlockItemData>());

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    #endregion

    #region ConvertPropertyValue via FormatBlockData

    [Test]
    public void FormatBlockData_WithNonBlockProperty_CallsFromEditor()
    {
        var convertedValue = "converted";
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns(convertedValue);

        var prop = CreatePropertyValue(TestEditorAlias, "original");
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        Assert.That(prop.Value, Is.EqualTo(convertedValue));
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Once);
    }

    [Test]
    public void FormatBlockData_PassesCorrectConfigToFromEditor()
    {
        var dataTypeKey = Guid.NewGuid();
        var expectedConfig = new object();
        _dataTypeConfigCacheMock
            .Setup(c => c.GetConfiguration(dataTypeKey))
            .Returns(expectedConfig);

        ContentPropertyData? capturedData = null;
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Callback<ContentPropertyData, object?>((data, _) => capturedData = data)
            .Returns("converted");

        var prop = CreatePropertyValue(TestEditorAlias, "value", dataTypeKey);
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        _dataTypeConfigCacheMock.Verify(c => c.GetConfiguration(dataTypeKey), Times.Once);
        Assert.That(capturedData, Is.Not.Null);
        Assert.That(capturedData!.DataTypeConfiguration, Is.SameAs(expectedConfig));
        Assert.That(capturedData.Value, Is.EqualTo("value"));
    }

    [Test]
    public void FormatBlockData_WithMultipleProperties_ConvertsAll()
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns("converted");

        var prop1 = CreatePropertyValue(TestEditorAlias, "val1");
        var prop2 = CreatePropertyValue(TestEditorAlias, "val2");
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop1, prop2) };

        _converter.FormatBlockData(blockData);

        Assert.That(prop1.Value, Is.EqualTo("converted"));
        Assert.That(prop2.Value, Is.EqualTo("converted"));
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Exactly(2));
    }

    [Test]
    public void FormatBlockData_WithMultipleBlockItems_ConvertsAll()
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns("converted");

        var prop1 = CreatePropertyValue(TestEditorAlias, "val1");
        var prop2 = CreatePropertyValue(TestEditorAlias, "val2");
        var blockData = new List<BlockItemData>
        {
            CreateBlockItemData(prop1),
            CreateBlockItemData(prop2)
        };

        _converter.FormatBlockData(blockData);

        Assert.That(prop1.Value, Is.EqualTo("converted"));
        Assert.That(prop2.Value, Is.EqualTo("converted"));
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), null),
            Times.Exactly(2));
    }

    [TestCase("")]
    [TestCase("   ")]
    public void FormatBlockData_WhenFromEditorReturnsNullForEmptyString_DoesNotLogWarning(string original)
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns((object?)null);

        var prop = CreatePropertyValue(TestEditorAlias, original);
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        VerifyWarningLogged(Times.Never());
    }

    [Test]
    public void FormatBlockData_WhenFromEditorReturnsNullForEmptyCollection_DoesNotLogWarning()
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns((object?)null);

        var prop = CreatePropertyValue(TestEditorAlias, new List<string>());
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        VerifyWarningLogged(Times.Never());
    }

    [Test]
    public void FormatBlockData_WhenFromEditorReturnsNullForRealValue_LogsWarning()
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns((object?)null);

        var prop = CreatePropertyValue(TestEditorAlias, "real data");
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        VerifyWarningLogged(Times.Once());
    }

    private static IEnumerable<TestCaseData> AsNodeAndElement(string alias, string json)
    {
        yield return new TestCaseData(alias, JsonNode.Parse(json)).SetName($"{alias} JsonNode {json}");
        yield return new TestCaseData(alias, JsonDocument.Parse(json).RootElement).SetName($"{alias} JsonElement {json}");
    }

    private static IEnumerable<TestCaseData> EmptyShapes()
    {
        foreach (var json in new[] { "{\"src\":\"\"}", "{\"src\":null}", "{}", "{\"crops\":[],\"name\":\"\"}", "[]", "\"\"" })
        {
            foreach (var alias in new[] { TestEditorAlias, ImageCropperAlias, UploadFieldAlias })
            {
                foreach (var data in AsNodeAndElement(alias, json)) yield return data;
            }
        }

        foreach (var json in new[]
        {
            "{\"focalPoint\":{\"left\":0.5,\"top\":0.5},\"crops\":[],\"src\":\"\"}",
            "{\"focalPoint\":null,\"crops\":[],\"src\":\"\",\"temporaryFileId\":\"\"}"
        })
        {
            foreach (var data in AsNodeAndElement(ImageCropperAlias, json)) yield return data;
        }
    }

    private static IEnumerable<TestCaseData> RealShapes()
    {
        var guid = Guid.NewGuid();
        foreach (var (alias, json) in new[]
        {
            (UploadFieldAlias, $"{{\"src\":\"\",\"temporaryFileId\":\"{guid}\"}}"),
            (ImageCropperAlias, $"{{\"focalPoint\":{{\"left\":0.5,\"top\":0.5}},\"crops\":[],\"src\":\"\",\"temporaryFileId\":\"{guid}\"}}"),
            (ImageCropperAlias, "{\"focalPoint\":{\"left\":0.2,\"top\":0.7},\"crops\":[],\"src\":\"\"}"),
            (ImageCropperAlias, "{\"src\":\"\",\"url\":\"https://example.com/a.jpg\"}"),
            (TestEditorAlias, "{\"src\":\"\",\"url\":\"https://example.com/a.jpg\"}"),
            (TestEditorAlias, "{\"focalPoint\":{\"left\":0.5,\"top\":0.5},\"crops\":[],\"src\":\"\"}"),
            (TestEditorAlias, "{\"src\":\"/media/a.jpg\",\"crops\":[]}"),
            (TestEditorAlias, "{\"value\":0}"),
            (TestEditorAlias, "{\"enabled\":false}"),
            (TestEditorAlias, "0"),
            (TestEditorAlias, "false")
        })
        {
            foreach (var data in AsNodeAndElement(alias, json)) yield return data;
        }
    }

    [TestCaseSource(nameof(EmptyShapes))]
    public void FormatBlockData_WhenFromEditorReturnsNullForEmptyJsonShape_DoesNotLogWarning(string alias, object original)
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns((object?)null);

        var prop = CreatePropertyValue(alias, original);
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        VerifyWarningLogged(Times.Never());
    }

    [TestCaseSource(nameof(EmptyShapes))]
    public void FormatBlockData_WhenFromEditorThrowsForEmptyJsonShape_KeepsValueAndDoesNotLogWarning(string alias, object original)
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Throws(new Exception("Invalid content key."));

        var prop = CreatePropertyValue(alias, original);
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        Assert.That(prop.Value, Is.SameAs(original));
        VerifyWarningLogged(Times.Never());
    }

    [TestCaseSource(nameof(RealShapes))]
    public void FormatBlockData_WhenFromEditorReturnsNullForRealJsonShape_LogsWarning(string alias, object original)
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Returns((object?)null);

        var prop = CreatePropertyValue(alias, original);
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        VerifyWarningLogged(Times.Once());
    }

    [TestCaseSource(nameof(RealShapes))]
    public void FormatBlockData_WhenFromEditorThrowsForRealJsonShape_KeepsValueAndLogsWarning(string alias, object original)
    {
        _valueEditorMock
            .Setup(v => v.FromEditor(It.IsAny<ContentPropertyData>(), null))
            .Throws(new Exception("boom"));

        var prop = CreatePropertyValue(alias, original);
        _converter.FormatBlockData(new List<BlockItemData> { CreateBlockItemData(prop) });

        Assert.That(prop.Value, Is.SameAs(original));
        VerifyWarningLogged(Times.Once());
    }

    private void VerifyWarningLogged(Times times) =>
        _loggerMock.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            times);

    #endregion

    #region Early-Exit Paths

    [Test]
    public void FormatBlockData_WithNullPropertyType_LeavesValueUnchanged()
    {
        // PropertyType is null by default, so EditorAlias is also null.
        // Falls through to ConvertPropertyValue which returns early.
        var prop = new BlockPropertyValue
        {
            Alias = "testProp",
            Value = "unchanged"
        };

        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        Assert.That(prop.Value, Is.EqualTo("unchanged"));
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    [Test]
    public void FormatBlockData_WithUnknownEditor_LeavesValueUnchanged()
    {
        var prop = CreatePropertyValue("Umbraco.Unknown", "unchanged");
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        Assert.That(prop.Value, Is.EqualTo("unchanged"));
        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    #endregion

    #region Block Editor Properties Skip ConvertPropertyValue

    [Test]
    public void FormatBlockData_BlockGridProperty_DoesNotCallFromEditor()
    {
        var prop = CreatePropertyValue(Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockGrid, null);
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    [Test]
    public void FormatBlockData_BlockListProperty_DoesNotCallFromEditor()
    {
        var prop = CreatePropertyValue(Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.BlockList, null);
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    [Test]
    public void FormatBlockData_RichTextProperty_DoesNotCallFromEditor()
    {
        var prop = CreatePropertyValue(Umbraco.Cms.Core.Constants.PropertyEditors.Aliases.RichText, null);
        var blockData = new List<BlockItemData> { CreateBlockItemData(prop) };

        _converter.FormatBlockData(blockData);

        _valueEditorMock.Verify(
            v => v.FromEditor(It.IsAny<ContentPropertyData>(), It.IsAny<object?>()),
            Times.Never);
    }

    #endregion
}
