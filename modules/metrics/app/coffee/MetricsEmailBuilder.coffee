EmailBuilder = require("../../../../app/js/Features/Email/EmailBuilder")
settings = require("settings-sharelatex")
moment = require('moment')

month = moment().subtract(1, "month").startOf("month").format('MMMM')

EmailBuilder.templates.institutionMetricsEmail = EmailBuilder.CTAEmailTemplate({
	subject: (opts) -> "Metrics report for #{opts.institutionName}"
	title: (opts) -> "#{month} Metrics report for #{opts.institutionName}"
	greeting: (opts) -> "Dear #{opts.userName},"
	message: (opts) -> """
Here's your monthly summary of <b>#{opts.institutionName}</b> usage on #{settings.appName}.

#{month} saw <b>#{opts.metrics.newUsers}</b> users signing up.

<b>#{opts.metrics.usage['active-users']}</b> users had <b>#{opts.metrics.usage['editing-sessions']}</b> editing sessions lasting a total of <b>#{opts.metrics.usage['total-session-duration']}</b> hours.

For more detailed v2 metrics you can visit the metrics hub using the button below or vist the <a href=#{opts.metricsUrl}> metrics dashboard </a>

"""
	ctaText: (opts) -> "Visit #{opts.institutionName} Hub"
	ctaURL: (opts) -> opts.hubUrl
})
