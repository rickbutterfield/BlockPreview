using NUnit.Framework;
using Umbraco.Community.BlockPreview.Helpers;

namespace Umbraco.Community.BlockPreview.Tests.Helpers;

[TestFixture]
public class PreviewMarkupCleanerTests
{
    [TestCase(null)]
    [TestCase("")]
    [TestCase("   ")]
    public void Clean_WithEmptyMarkup_ReturnsItUnchanged(string? markup)
    {
        Assert.That(PreviewMarkupCleaner.Clean(markup!), Is.EqualTo(markup));
    }

    [Test]
    public void Clean_WithLink_DisablesNavigation()
    {
        var result = PreviewMarkupCleaner.Clean("<a href=\"/about\">About</a>");

        Assert.That(result, Is.EqualTo("<a href=\"javascript:;\" data-block-preview-link=\"true\">About</a>"));
    }

    [Test]
    public void Clean_WithFormElements_DisablesThem()
    {
        var result = PreviewMarkupCleaner.Clean("<input type=\"text\"><button>Go</button>");

        Assert.That(result, Does.Contain("<input type=\"text\" disabled=\"disabled\">"));
        Assert.That(result, Does.Contain("<button disabled=\"disabled\">Go</button>"));
    }

    [TestCase("<img src=\"x\" onerror=\"alert(1)\">", "onerror")]
    [TestCase("<div ONCLICK=\"alert(1)\">Text</div>", "ONCLICK")]
    [TestCase("<svg onload=\"alert(1)\"></svg>", "onload")]
    public void Clean_WithEventHandlerAttribute_RemovesIt(string markup, string attribute)
    {
        var result = PreviewMarkupCleaner.Clean(markup);

        Assert.That(result, Does.Not.Contain(attribute).IgnoreCase);
    }

    [TestCase("<script>alert(1)</script><p>Text</p>")]
    [TestCase("<base href=\"https://example.com/\"><p>Text</p>")]
    [TestCase("<meta http-equiv=\"refresh\" content=\"0;url=https://example.com\"><p>Text</p>")]
    public void Clean_WithActiveElement_RemovesItAndKeepsTheRest(string markup)
    {
        var result = PreviewMarkupCleaner.Clean(markup);

        Assert.That(result, Is.EqualTo("<p>Text</p>"));
    }

    [TestCase("<iframe src=\"javascript:alert(1)\"></iframe>")]
    [TestCase("<iframe src=\" JaVaScRiPt:alert(1)\"></iframe>")]
    [TestCase("<iframe src=\"java&#x09;script:alert(1)\"></iframe>")]
    [TestCase("<object data=\"data:text/html,<script>alert(1)</script>\"></object>")]
    [TestCase("<embed src=\"vbscript:msgbox(1)\">")]
    public void Clean_WithScriptUrl_RemovesTheAttribute(string markup)
    {
        var result = PreviewMarkupCleaner.Clean(markup);

        Assert.That(result, Does.Not.Contain("script:").IgnoreCase);
        Assert.That(result, Does.Not.Contain("data:text/html").IgnoreCase);
    }

    [Test]
    public void Clean_WithIframeSrcdoc_RemovesTheAttribute()
    {
        var result = PreviewMarkupCleaner.Clean("<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>");

        Assert.That(result, Is.EqualTo("<iframe></iframe>"));
    }

    [TestCase("<svg><set attributeName=\"onmouseover\" to=\"alert(1)\"/></svg>")]
    [TestCase("<svg><a><animate attributeName=\"href\" values=\"javascript:alert(1)\"/></a></svg>")]
    public void Clean_WithSvgAnimationOfHandlerOrLink_RemovesIt(string markup)
    {
        var result = PreviewMarkupCleaner.Clean(markup);

        Assert.That(result, Does.Not.Contain("<set").And.Not.Contain("<animate"));
    }

    [Test]
    public void Clean_WithSvgAnimationOfOtherAttribute_KeepsIt()
    {
        const string markup = "<svg><circle r=\"5\"><animate attributeName=\"r\" values=\"5;10\"></animate></circle></svg>";

        // HtmlAgilityPack writes attribute names in lower case, which browsers accept for SVG too.
        Assert.That(PreviewMarkupCleaner.Clean(markup), Is.EqualTo(markup).IgnoreCase);
    }

    [TestCase("<img src=\"/media/image.jpg\" alt=\"Image\">")]
    [TestCase("<img src=\"data:image/png;base64,iVBORw0KGgo=\" alt=\"Inline\">")]
    [TestCase("<iframe src=\"https://www.youtube.com/embed/abc\"></iframe>")]
    [TestCase("<style>.block { color: red; }</style><div class=\"block\" style=\"margin: 0\">Text</div>")]
    [TestCase("<p data-online=\"true\">Text</p>")]
    public void Clean_WithSafeMarkup_LeavesItUnchanged(string markup)
    {
        Assert.That(PreviewMarkupCleaner.Clean(markup), Is.EqualTo(markup));
    }
}
