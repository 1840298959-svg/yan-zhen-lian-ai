using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: System.Reflection.AssemblyTitle("验真链 AI")]
[assembly: System.Reflection.AssemblyDescription("项目验收证据审查工作台")]
[assembly: System.Reflection.AssemblyVersion("0.1.0.0")]
[assembly: System.Reflection.AssemblyFileVersion("0.1.0.0")]

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        bool first;
        using (var mutex = new Mutex(true, @"Local\YanZhenLianAI.Workbench", out first))
        {
            if (!first)
            {
                MessageBox.Show("验真链 AI 已在运行。请切换到已打开的窗口。", "验真链 AI");
                return;
            }
            var appDir = AppDomain.CurrentDomain.BaseDirectory;
            var dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "YanZhenLianAI");
            Application.Run(new Workbench(appDir, dataDir));
        }
    }
}

internal sealed class Workbench : Form
{
    private readonly string appDir;
    private readonly string dataDir;
    private readonly Label status;
    private readonly Button aiSettings;
    private readonly WebView2 view;
    private readonly LocalBackend backend;
    private Uri origin;
    private bool closing;

    public Workbench(string appDir, string dataDir)
    {
        this.appDir = appDir;
        this.dataDir = dataDir;
        backend = new LocalBackend(appDir, dataDir);
        Text = "验真链 AI";
        ClientSize = new Size(1320, 860);
        MinimumSize = new Size(940, 640);
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Microsoft YaHei UI", 10f);
        BackColor = Color.FromArgb(245, 248, 250);
        var icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        if (icon != null) Icon = icon;

        var menu = new FlowLayoutPanel {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, BackColor = Color.White,
            Padding = new Padding(9, 5, 9, 0), WrapContents = false
        };
        aiSettings = MenuButton("AI 设置", async delegate { await ChangeAiSettings(); });
        aiSettings.Enabled = false;
        menu.Controls.Add(aiSettings);
        menu.Controls.Add(MenuButton("打开数据目录", delegate {
            Directory.CreateDirectory(dataDir);
            Process.Start(new ProcessStartInfo(dataDir) { UseShellExecute = true });
        }));

        var main = new Panel { Dock = DockStyle.Fill };
        view = new WebView2 { Dock = DockStyle.Fill, Visible = false };
        status = new Label {
            Text = "正在启动验真链 AI…", Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter, Font = new Font(Font.FontFamily, 15f)
        };
        main.Controls.Add(view);
        main.Controls.Add(status);
        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2, Margin = Padding.Empty };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 49));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.Controls.Add(menu, 0, 0);
        layout.Controls.Add(main, 0, 1);
        Controls.Add(layout);
        Shown += async delegate { await OpenWorkbench(); };
        FormClosed += delegate { closing = true; backend.Dispose(); };
    }

    private Button MenuButton(string text, EventHandler action)
    {
        var button = new Button {
            Text = text, AutoSize = true, Height = 31, FlatStyle = FlatStyle.Flat,
            Padding = new Padding(10, 0, 10, 0), ForeColor = Color.FromArgb(22, 69, 72),
            BackColor = Color.FromArgb(241, 249, 248)
        };
        button.FlatAppearance.BorderColor = Color.FromArgb(198, 224, 224);
        button.Click += action;
        return button;
    }

    private async Task OpenWorkbench()
    {
        try
        {
            Directory.CreateDirectory(dataDir);
            if (!File.Exists(backend.DatabasePath))
                File.Copy(Path.Combine(appDir, "app", "demo.db"), backend.DatabasePath, false);
            if (view.CoreWebView2 == null)
            {
                var environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(dataDir, "Browser"));
                if (closing) return;
                await view.EnsureCoreWebView2Async(environment);
                view.CoreWebView2.Settings.AreDevToolsEnabled = false;
                view.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args) {
                    if (!BelongsToWorkbench(args.Uri)) args.Cancel = true;
                };
                view.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs args) {
                    args.Handled = true;
                    if (BelongsToWorkbench(args.Uri)) view.CoreWebView2.Navigate(args.Uri);
                };
                view.CoreWebView2.NavigationCompleted += delegate(object sender, CoreWebView2NavigationCompletedEventArgs args) {
                    if (closing || origin == null || view.Source == null || !BelongsToWorkbench(view.Source.AbsoluteUri)) return;
                    view.Visible = args.IsSuccess;
                    status.Visible = !args.IsSuccess;
                    if (!args.IsSuccess) status.Text = "页面加载失败，请关闭窗口后重新打开。";
                };
            }
            if (closing) return;
            var port = await backend.Start();
            if (closing) return;
            origin = new Uri("http://127.0.0.1:" + port + "/");
            var cookie = view.CoreWebView2.CookieManager.CreateCookie("yzl_session", backend.Session, "127.0.0.1", "/");
            cookie.IsHttpOnly = true;
            cookie.SameSite = CoreWebView2CookieSameSiteKind.Strict;
            view.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
            view.CoreWebView2.Navigate(origin.AbsoluteUri);
            aiSettings.Enabled = true;
        }
        catch (Exception error)
        {
            backend.Dispose();
            if (closing) return;
            var description = error is WebView2RuntimeNotFoundException
                ? "需要 Microsoft Edge WebView2 运行时。安装后重新打开验真链 AI。"
                : "启动失败。请查看数据目录中的 desktop.log。";
            status.Text = description;
            backend.WriteDiagnostic(error.Message);
            aiSettings.Enabled = true;
        }
    }

    private bool BelongsToWorkbench(string address)
    {
        Uri target;
        return origin != null && Uri.TryCreate(address, UriKind.Absolute, out target) &&
            target.Scheme == origin.Scheme && target.Host == origin.Host && target.Port == origin.Port;
    }

    private async Task ChangeAiSettings()
    {
        try
        {
            using (var dialog = new AiDialog(AiConfig.Load(dataDir)))
            {
                if (dialog.ShowDialog(this) != DialogResult.OK) return;
                dialog.Value.Save(dataDir);
            }
            aiSettings.Enabled = false;
            view.Visible = false;
            status.Text = "正在应用 AI 设置并重新启动…";
            status.Visible = true;
            origin = null;
            backend.Dispose();
            await OpenWorkbench();
        }
        catch (Exception error)
        {
            MessageBox.Show(this, error.Message, "AI 设置", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

internal sealed class LocalBackend : IDisposable
{
    private readonly string appDir;
    private readonly string dataDir;
    private readonly object logLock = new object();
    private Process process;
    public string Session { get; private set; }
    public string DatabasePath { get { return Path.Combine(dataDir, "workbench.db"); } }

    public LocalBackend(string appDir, string dataDir)
    {
        this.appDir = appDir;
        this.dataDir = dataDir;
    }

    public async Task<int> Start()
    {
        var app = Path.Combine(appDir, "app");
        var node = Path.Combine(appDir, "runtime", "node.exe");
        if (!File.Exists(node) || !File.Exists(Path.Combine(app, "desktop-server.cjs")))
            throw new FileNotFoundException("程序文件不完整，请完整解压桌面版。");
        var ai = AiConfig.Load(dataDir);
        Session = NewSession();
        var ready = new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously);
        var start = new ProcessStartInfo(node, "desktop-server.cjs") {
            UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = app,
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
        };
        start.EnvironmentVariables["YZL_DATA_DIR"] = dataDir;
        start.EnvironmentVariables["DATABASE_URL"] = "file:" + DatabasePath.Replace('\\', '/').Replace("%", "%25").Replace("#", "%23").Replace("?", "%3F");
        start.EnvironmentVariables["YZL_DESKTOP_SESSION"] = Session;
        start.EnvironmentVariables["OPENAI_API_KEY"] = ai.Key;
        start.EnvironmentVariables["OPENAI_BASE_URL"] = ai.Endpoint;
        start.EnvironmentVariables["OPENAI_MODEL"] = ai.Model;
        start.EnvironmentVariables.Remove("NODE_OPTIONS");
        start.EnvironmentVariables.Remove("NODE_PATH");
        start.EnvironmentVariables.Remove("PRISMA_QUERY_ENGINE_LIBRARY");
        var worker = new Process { StartInfo = start, EnableRaisingEvents = true };
        worker.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args) {
            if (args.Data == null) return;
            var match = Regex.Match(args.Data, @"^YZL_READY (\d+)$");
            int port;
            if (match.Success && int.TryParse(match.Groups[1].Value, out port)) ready.TrySetResult(port);
            else WriteDiagnostic(args.Data);
        };
        worker.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args) {
            if (args.Data != null) WriteDiagnostic(args.Data);
        };
        worker.Exited += delegate { ready.TrySetException(new InvalidOperationException("本地服务在就绪前退出。")); };
        process = worker;
        worker.Start();
        worker.BeginOutputReadLine();
        worker.BeginErrorReadLine();
        if (await Task.WhenAny(ready.Task, Task.Delay(TimeSpan.FromSeconds(30))) != ready.Task)
            throw new TimeoutException("本地服务启动超时。");
        return await ready.Task;
    }

    private static string NewSession()
    {
        var bytes = new byte[32];
        using (var random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
        return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
    }

    internal void WriteDiagnostic(string line)
    {
        try {
            lock (logLock)
                File.AppendAllText(Path.Combine(dataDir, "desktop.log"), DateTime.Now.ToString("s") + " " + line + Environment.NewLine, Encoding.UTF8);
        } catch (IOException) { }
    }

    public void Dispose()
    {
        var worker = process;
        process = null;
        if (worker == null) return;
        try
        {
            if (!worker.HasExited)
            {
                worker.StandardInput.Close();
                if (!worker.WaitForExit(2000)) worker.Kill();
            }
        }
        catch (InvalidOperationException) { }
        catch (System.ComponentModel.Win32Exception) { }
        finally { worker.Dispose(); }
    }
}

internal sealed class AiConfig
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("YanZhenLianAI-model-settings-v1");
    internal const string DefaultEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/";
    internal string Endpoint = DefaultEndpoint;
    internal string Model = "";
    internal string Key = "";

    public static AiConfig Load(string directory)
    {
        var file = Path.Combine(directory, "ai-settings.dat");
        if (!File.Exists(file)) return new AiConfig();
        try
        {
            var fields = Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(file), Entropy, DataProtectionScope.CurrentUser)).Split('\n');
            if (fields.Length != 3) throw new FormatException();
            return new AiConfig { Endpoint = fields[0], Model = fields[1], Key = fields[2] };
        }
        catch (CryptographicException) { return new AiConfig(); }
        catch (FormatException) { return new AiConfig(); }
    }

    public void Save(string directory)
    {
        var file = Path.Combine(directory, "ai-settings.dat");
        var temp = file + ".tmp";
        var fields = Encoding.UTF8.GetBytes(string.Join("\n", Endpoint, Model, Key));
        File.WriteAllBytes(temp, ProtectedData.Protect(fields, Entropy, DataProtectionScope.CurrentUser));
        if (File.Exists(file)) File.Replace(temp, file, null);
        else File.Move(temp, file);
    }
}

internal sealed class AiDialog : Form
{
    private readonly TextBox endpoint;
    private readonly TextBox model;
    private readonly TextBox key;
    public AiConfig Value { get; private set; }

    public AiDialog(AiConfig current)
    {
        Text = "AI 设置 · 验真链 AI";
        ClientSize = new Size(610, 305);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.CenterParent;
        Font = new Font("Microsoft YaHei UI", 10f);
        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(17), ColumnCount = 2, RowCount = 5 };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 77));
        for (int i = 0; i < 3; i++) layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 43));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        var help = new Label {
            Dock = DockStyle.Fill,
            Text = "填写模型的接口地址、模型名称和密钥。留空密钥即可使用人工工作台和内置演示。启用 AI 后，参与分析的材料会发送到所填接口。扫描 PDF 识别使用 Gemini 官方接口。"
        };
        layout.Controls.Add(help, 0, 0);
        layout.SetColumnSpan(help, 2);
        endpoint = AddField(layout, "接口地址", current.Endpoint, 1);
        model = AddField(layout, "模型名称", current.Model, 2);
        key = AddField(layout, "API 密钥", current.Key, 3);
        key.UseSystemPasswordChar = true;
        var actions = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft };
        var save = new Button { Text = "保存并应用", AutoSize = true, Height = 34 };
        save.Click += delegate { SaveFields(); };
        var cancel = new Button { Text = "取消", DialogResult = DialogResult.Cancel, AutoSize = true, Height = 34 };
        actions.Controls.Add(save);
        actions.Controls.Add(cancel);
        layout.Controls.Add(actions, 1, 4);
        Controls.Add(layout);
        AcceptButton = save;
        CancelButton = cancel;
    }

    private static TextBox AddField(TableLayoutPanel layout, string label, string value, int row)
    {
        layout.Controls.Add(new Label { Text = label, Dock = DockStyle.Fill, TextAlign = ContentAlignment.TopLeft }, 0, row);
        var field = new TextBox { Text = value, Dock = DockStyle.Top };
        layout.Controls.Add(field, 1, row);
        return field;
    }

    private void SaveFields()
    {
        var address = endpoint.Text.Trim();
        var name = model.Text.Trim();
        var secret = key.Text.Trim();
        Uri uri;
        if (!Uri.TryCreate(address, UriKind.Absolute, out uri) || uri.Scheme != "https" ||
            !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            MessageBox.Show(this, "请输入 HTTPS 接口地址，不含账户信息、查询参数或片段。", Text);
            return;
        }
        if (secret.Length > 0 && name.Length == 0)
        {
            MessageBox.Show(this, "启用 AI 时，请填写模型名称。", Text);
            return;
        }
        Value = new AiConfig { Endpoint = address, Model = name, Key = secret };
        DialogResult = DialogResult.OK;
    }
}
