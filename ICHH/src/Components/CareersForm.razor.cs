using ICHH.src.Email;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Configuration;
using Microsoft.JSInterop;
using MimeKit;
using System.IO;
using System.ComponentModel.DataAnnotations;
using System;
using System.Net.Mail;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Globalization;

namespace ICHH.src.Components;

public partial class CareersForm
{
    [Inject] private IConfiguration Configuration { get; set; } = default!;
    [Inject] private IServiceProvider ServiceProvider { get; set; } = default!;
    [Inject] private ILoggerFactory LoggerFactory { get; set; } = default!;
    [Inject] private IHttpClientFactory HttpClientFactory { get; set; } = default!;
    [Inject] private IJSRuntime JS { get; set; } = default!;

    [Parameter]
    public string? SelectedPosition { get; set; }

    protected CareersFormInput FormInput { get; set; } = new();
    protected string? StatusMessage { get; set; }
    protected bool IsSuccess { get; set; }
    protected bool IsSubmitting { get; set; } = false;
    protected bool CaptchaError { get; set; }
    protected bool ShowSuccessModal { get; set; }
    protected bool IsPositionDisabled { get; set; }
    protected string? ResumeValidationMessage { get; set; }

    protected string MinDateOfBirth =>
        DateOnly.FromDateTime(DateTime.Today)
            .AddYears(-80)
            .AddDays(1)
            .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    protected string MaxDateOfBirth =>
        DateOnly.FromDateTime(DateTime.Today)
            .AddYears(-18)
            .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private bool _needsRecaptchaRender;
    private const long MaxResumeSizeBytes = 10 * 1024 * 1024; // 10MB
    private static readonly HashSet<string> AllowedResumeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".doc",
        ".docx"
    };

    protected override void OnInitialized()
    {
        FormInput ??= new CareersFormInput();

        // Auto-fill position if provided
        if (!string.IsNullOrEmpty(SelectedPosition))
        {
            FormInput.PositionDesired = SelectedPosition;
            IsPositionDisabled = true;
        }
    }

    protected override void OnParametersSet()
    {
        // Update position if parameter changes
        if (!string.IsNullOrEmpty(SelectedPosition) && FormInput.PositionDesired != SelectedPosition)
        {
            FormInput.PositionDesired = SelectedPosition;
            IsPositionDisabled = true;
        }
    }

    protected void CloseSuccessModal()
    {
        ShowSuccessModal = false;
        StatusMessage = null;
        StateHasChanged();
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            // Try to auto-fill position from the URL (id or jobTitle) using the client-side jobs data
            try
            {
                // Only auto-fill if not already set from SelectedPosition or server-side
                if (string.IsNullOrWhiteSpace(FormInput.PositionDesired) && string.IsNullOrWhiteSpace(SelectedPosition))
                {
                    var jobTitle = await JS.InvokeAsync<string?>("getJobTitleFromQuery");
                    if (!string.IsNullOrEmpty(jobTitle))
                    {
                        FormInput.PositionDesired = jobTitle;
                        IsPositionDisabled = true;
                        StateHasChanged();
                    }
                }
            }
            catch (JSException jsEx)
            {
                Console.WriteLine($"[JOB AUTO-FILL JS ERROR] {jsEx.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JOB AUTO-FILL ERROR] {ex.Message}");
            }

            // Initialize phone mask and validation
            try
            {
                await JS.InvokeVoidAsync("applyPhoneMask", "phoneInput");
                await JS.InvokeVoidAsync("applyZipCodeMask", "zipCodeInput");
                await JS.InvokeVoidAsync("initCareersResumeUpload", "resumeUpload", MaxResumeSizeBytes);
                Console.WriteLine("[PHONE MASK] Applied successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PHONE MASK ERROR] {ex.Message}");
            }
        }

        if (firstRender || _needsRecaptchaRender)
        {
            _needsRecaptchaRender = false;
            await Task.Delay(200);
            try
            {
                var siteKey = Configuration["Recaptcha:SiteKey"]!;
                var rendered = await JS.InvokeAsync<bool>("renderRecaptcha", "recaptcha-container", siteKey);
                if (!rendered)
                    Console.WriteLine("[RECAPTCHA] Widget failed to render — check site key and domain settings.");
            }
            catch (JSException ex)
            {
                Console.WriteLine($"[RECAPTCHA ERROR] {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Formats a phone number for display
    /// </summary>
    protected string FormatPhoneNumber(string phoneNumber)
    {
        return PhoneHelper.FormatPhoneNumber(phoneNumber);
    }

    /// <summary>
    /// Validates a phone number and returns validation feedback
    /// </summary>
    protected PhoneValidationResult ValidatePhoneNumber(string phoneNumber)
    {
        return PhoneHelper.ValidatePhoneNumber(phoneNumber);
    }

    /// <summary>
    /// Formats a ZIP code for display (12345 or 12345-6789)
    /// </summary>
    protected string FormatZipCode(string zipCode)
    {
        return ZipCodeHelper.FormatZipCode(zipCode);
    }

    /// <summary>
    /// Validates ZIP code and returns validation feedback
    /// </summary>
    protected ZipValidationResult ValidateZipCode(string zipCode)
    {
        return ZipCodeHelper.ValidateZipCode(zipCode);
    }

    private async Task<bool> ValidateCaptchaAsync(string token)
    {
        try
        {
            using var client = HttpClientFactory.CreateClient();
            var secretKey = Configuration["Recaptcha:SecretKey"]!;

            var content = new FormUrlEncodedContent(
            [
                new KeyValuePair<string, string>("secret", secretKey),
                new KeyValuePair<string, string>("response", token)
            ]);

            var response = await client.PostAsync(
                "https://www.google.com/recaptcha/api/siteverify", content);

            var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>();
            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CAPTCHA ERROR] {ex.Message}");
            return false;
        }
    }

    private record RecaptchaResponse(
    [property: JsonPropertyName("success")] bool Success
    );

    private sealed class ResumeUploadPayload
    {
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string Base64 { get; set; } = string.Empty;
    }

    private sealed class AppliedJobDetails
    {
        public string PayRate { get; set; } = string.Empty;
        public string County { get; set; } = string.Empty;
        public string Shift { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    // Submit Button 
    protected async Task Submit()
    {
        ResumeValidationMessage = null;

        ResumeUploadPayload? resumePayload;
        try
        {
            resumePayload = await JS.InvokeAsync<ResumeUploadPayload?>("getCareersResumeUpload");
        }
        catch (JSException)
        {
            IsSuccess = false;
            StatusMessage = "Resume upload script is unavailable. Please refresh the page and try again.";
            return;
        }

        if (resumePayload is null || string.IsNullOrWhiteSpace(resumePayload.FileName) || string.IsNullOrWhiteSpace(resumePayload.Base64))
        {
            IsSuccess = false;
            ResumeValidationMessage = "Please upload your resume.";
            StatusMessage = null;
            StateHasChanged();
            return;
        }

        FormInput.ResumeFileName = resumePayload.FileName;
        FormInput.ResumeContentType = resumePayload.ContentType;
        FormInput.ResumeBase64 = resumePayload.Base64;

        // Validate CAPTCHA first
        var captchaToken = await JS.InvokeAsync<string>("getCaptchaToken");
        if (string.IsNullOrEmpty(captchaToken))
        {
            CaptchaError = true;
            StateHasChanged();
            return;
        }

        var captchaValid = await ValidateCaptchaAsync(captchaToken);
        if (!captchaValid)
        {
            CaptchaError = true;
            await JS.InvokeVoidAsync("resetCaptcha");
            StateHasChanged();
            return;
        }

        CaptchaError = false;
        IsSubmitting = true;
        StatusMessage = null;
        StateHasChanged();

        try
        {
            var host = Configuration["Smtp:Host"]!;
            var port = int.Parse(Configuration["Smtp:Port"]!);
            var username = Configuration["Smtp:Username"]!;
            var password = Configuration["Smtp:Password"]!;
            var fromAddress = Configuration["Smtp:FromAddress"]!;
            var fromName = Configuration["Smtp:FromName"]!;
            var toAddress = Configuration["Smtp:ToAddress"]!;

            AppliedJobDetails? appliedJob = null;

            try
            {
                appliedJob = await JS.InvokeAsync<AppliedJobDetails?>("getAppliedJobDetailsFromQuery");
            }
            catch (JSException jsEx)
            {
                Console.WriteLine($"[JOB DETAILS JS ERROR] {jsEx.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JOB DETAILS ERROR] {ex.Message}");
            }

            using var htmlRenderer = new HtmlRenderer(ServiceProvider, LoggerFactory);
            var htmlBody = await htmlRenderer.Dispatcher.InvokeAsync(async () =>
            {
                var output = await htmlRenderer.RenderComponentAsync<CareersEmailTemplate>(
                    ParameterView.FromDictionary(new Dictionary<string, object?>
                    {
                        { nameof(CareersEmailTemplate.FirstName), FormInput.FirstName },
                        { nameof(CareersEmailTemplate.LastName), FormInput.LastName },
                        { nameof(CareersEmailTemplate.DateOfBirth), FormInput.DateOfBirth },
                        { nameof(CareersEmailTemplate.Email), FormInput.Email },
                        { nameof(CareersEmailTemplate.Phone), FormInput.PhoneNumber },
                        { nameof(CareersEmailTemplate.Address), FormInput.Address },
                        { nameof(CareersEmailTemplate.City), FormInput.City },
                        { nameof(CareersEmailTemplate.State), FormInput.State },
                        { nameof(CareersEmailTemplate.ZipCode), FormInput.ZipCode },
                        { nameof(CareersEmailTemplate.PositionDesired), FormInput.PositionDesired },
                        { nameof(CareersEmailTemplate.Comments), FormInput.Comments },
                        { nameof(CareersEmailTemplate.PayRate), appliedJob?.PayRate ?? string.Empty },
                        { nameof(CareersEmailTemplate.County), appliedJob?.County ?? string.Empty },
                        { nameof(CareersEmailTemplate.Shift), appliedJob?.Shift ?? string.Empty },
                        { nameof(CareersEmailTemplate.Status), appliedJob?.Status ?? string.Empty },
                    }));
                return output.ToHtmlString();
            });

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddress));
            message.To.Add(new MailboxAddress("Intuitive Care", toAddress));
            message.ReplyTo.Add(new MailboxAddress(FormInput.FirstName, FormInput.Email));
            message.Subject = $"New Job Application from {FormInput.FirstName}";

            var resumeExtension = Path.GetExtension(FormInput.ResumeFileName);
            if (string.IsNullOrWhiteSpace(resumeExtension) || !AllowedResumeExtensions.Contains(resumeExtension))
            {
                IsSuccess = false;
                StatusMessage = "Resume format is not supported. Please upload a PDF, DOC, or DOCX file.";
                await JS.InvokeVoidAsync("resetCaptcha");
                return;
            }

            byte[] resumeBytes;
            try
            {
                resumeBytes = Convert.FromBase64String(FormInput.ResumeBase64);
            }
            catch (FormatException)
            {
                IsSuccess = false;
                StatusMessage = "Could not process the uploaded resume file. Please re-select it and try again.";
                await JS.InvokeVoidAsync("resetCaptcha");
                return;
            }

            if (resumeBytes.Length == 0 || resumeBytes.Length > MaxResumeSizeBytes)
            {
                IsSuccess = false;
                StatusMessage = "Could not read the resume file. Please re-select it and try again.";
                await JS.InvokeVoidAsync("resetCaptcha");
                return;
            }

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };

            var contentType = string.IsNullOrWhiteSpace(FormInput.ResumeContentType)
                ? MimeTypes.GetMimeType(FormInput.ResumeFileName)
                : FormInput.ResumeContentType;
            bodyBuilder.Attachments.Add(FormInput.ResumeFileName, resumeBytes, ContentType.Parse(contentType));
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new MailKit.Net.Smtp.SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            IsSuccess = true;
            ShowSuccessModal = true;
            ResumeValidationMessage = null;
            FormInput = new CareersFormInput();
            _needsRecaptchaRender = true;
            await JS.InvokeVoidAsync("resetCaptcha");
        }
        catch (Exception ex)
        {
            IsSuccess = false;
            StatusMessage = $"Failed to send your application: {ex.Message}";
            Console.WriteLine($"[SMTP ERROR] {ex.Message}");
            await JS.InvokeVoidAsync("resetCaptcha");
        }
        finally
        {
            IsSubmitting = false;
            StateHasChanged();
        }
    }

    /// Helper class for phone number formatting and validation
    internal static class PhoneHelper
    {
        /// Extracts only digits from the input string
        private static string ExtractDigits(string input)
        {
            return Regex.Replace(input, @"\D", "");
        }

        /// Formats a phone number to (XXX) XXX-XXXX format
        internal static string FormatPhoneNumber(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            var digits = ExtractDigits(input);

            // Truncate to 10 digits max
            if (digits.Length > 10)
                digits = digits.Substring(0, 10);

            // Format as (XXX) XXX-XXXX
            return digits.Length switch
            {
                0 => string.Empty,
                <= 3 => $"({digits}",
                <= 6 => $"({digits.Substring(0, 3)}) {digits.Substring(3)}",
                _ => $"({digits.Substring(0, 3)}) {digits.Substring(3, 3)}-{digits.Substring(6)}"
            };
        }

        internal static PhoneValidationResult ValidatePhoneNumber(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return new PhoneValidationResult { IsValid = true, Message = string.Empty };

            var digits = ExtractDigits(input);

            if (digits[0] == '0' || digits[0] == '1')
                return new PhoneValidationResult
                {
                    IsValid = false,
                    Message = "Invalid area code. Cannot start with 0 or 1"
                };

            if (digits.Length == 10)
                return new PhoneValidationResult
                {
                    IsValid = true,
                    Message = "Valid phone number"
                };

            return new PhoneValidationResult
            {
                IsValid = false,
                Message = "Too many digits"
            };
        }
    }

    /// Helper class for ZIP code formatting and validation
    internal static class ZipCodeHelper
    {
        /// Extracts only digits from the input string
        private static string ExtractDigits(string input)
        {
            return Regex.Replace(input, @"\D", "");
        }

        /// Formats a ZIP code to 12345 or 12345-6789
        internal static string FormatZipCode(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            var digits = ExtractDigits(input);

            // Truncate to ZIP+4 max length
            if (digits.Length > 9)
                digits = digits[..9];

            return digits.Length switch
            {
                <= 5 => digits,
                _ => $"{digits[..5]}-{digits[5..]}"
            };
        }

        internal static ZipValidationResult ValidateZipCode(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return new ZipValidationResult { IsValid = true, Message = string.Empty };

            var digits = ExtractDigits(input);

            if (digits.Length == 5 || digits.Length == 9)
            {
                return new ZipValidationResult
                {
                    IsValid = true,
                    Message = "Valid ZIP code"
                };
            }

            if (digits.Length < 5)
            {
                return new ZipValidationResult
                {
                    IsValid = false,
                    Message = $"ZIP code incomplete ({digits.Length}/5 digits)"
                };
            }

            return new ZipValidationResult
            {
                IsValid = false,
                Message = "Invalid ZIP code length"
            };
        }
    }

    public class PhoneValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ZipValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ValidDateOfBirthAttribute : ValidationAttribute
    {
        private const int MinimumAge = 18;
        private const int MaximumAgeExclusive = 60;

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is null)
                return ValidationResult.Success;

            if (value is not DateOnly dateOfBirth)
                return new ValidationResult("Invalid date of birth.");

            var today = DateOnly.FromDateTime(DateTime.Today);

            if (dateOfBirth >= today)
                return new ValidationResult("Date of birth cannot be today or in the future.");

            var age = today.Year - dateOfBirth.Year;
            if (dateOfBirth.AddYears(age) > today)
                age--;

            if (age < MinimumAge)
                return new ValidationResult($"You must be at least {MinimumAge} years old.");

            if (age >= MaximumAgeExclusive)
                return new ValidationResult($"You must be under {MaximumAgeExclusive} years old.");

            return ValidationResult.Success;
        }
    }

    public class CareersFormInput
    {
        // First Name
        [Required(ErrorMessage = "First name is required")]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        // Last Name
        [Required(ErrorMessage = "Last name is required")]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        // Date of Birth
        [Required(ErrorMessage = "Date of birth is required")]
        [ValidDateOfBirth]
        public DateOnly? DateOfBirth { get; set; }

        // Email
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email address")]
        public string Email { get; set; } = string.Empty;

        // Phone Number
        [Required(ErrorMessage = "Phone number is required")]
        public string PhoneNumber { get; set; } = string.Empty;

        // Address
        [Required(ErrorMessage = "Address is required")]
        [StringLength(200)]
        public string Address { get; set; } = string.Empty;

        // City
        [Required(ErrorMessage = "City is required")]
        [StringLength(100)]
        public string City { get; set; } = string.Empty;

        // State
        [Required(ErrorMessage = "State is required")]
        [StringLength(50)]
        public string State { get; set; } = string.Empty;

        // Zip Code
        [Required(ErrorMessage = "Zip code is required")]
        [RegularExpression(@"^\d{5}(-\d{4})?$", ErrorMessage = "Please enter a valid ZIP Code " +
            "in 12345 or 12345-6789 format.")]
        public string ZipCode { get; set; } = string.Empty;

        // Position Desired
        [Required(ErrorMessage = "Position desired is required")]
        public string PositionDesired { get; set; } = string.Empty;

        // Resume Upload
        public string ResumeFileName { get; set; } = string.Empty;
        public string ResumeContentType { get; set; } = string.Empty;
        public string ResumeBase64 { get; set; } = string.Empty;

        // Comments
        [StringLength(1000)]
        public string Comments { get; set; } = string.Empty;

        // Consent Checkbox
        [Required(ErrorMessage = "You must consent to continue")]
        [Range(typeof(bool), "true", "true", ErrorMessage = "You must consent to continue")]
        public bool Consent { get; set; }
    }
}