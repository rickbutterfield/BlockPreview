using Umbraco.Community.BlockPreview.Extensions;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.TestSite.Services;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview(options =>
    {
        options.BlockGrid = new()
        {
            Enabled = true,
            Stylesheets = ["/css/myblockgridlayout.css"]
        };
        options.BlockList = new()
        {
            Enabled = true,
            Stylesheets = ["/css/myblockgridlayout.css"]
        };
        options.RichText = new()
        {
            Enabled = true,
            Stylesheets = ["/css/myblockgridlayout.css"]
        };
        options.SingleBlock = new()
        {
            Enabled = true,
            Stylesheets = ["/css/myblockgridlayout.css"]
        };
    })
    .Build();

builder.Services.AddUnique<IBlockPreviewService, CustomBlockPreviewService>(ServiceLifetime.Scoped);
builder.Services.AddUnique<IBlockPreviewRequestEnricher, BlockPreviewRequestEnricher>(ServiceLifetime.Scoped);
builder.Services.AddUnique<IBlockPreviewResponseEnricher, BlockPreviewResponseEnricher>(ServiceLifetime.Scoped);

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

#if (UseHttpsRedirect)
app.UseHttpsRedirection();
#endif

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
