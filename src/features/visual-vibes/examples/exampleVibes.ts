export type ExampleVibe = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  yaml: string;
};

export const exampleVibes: ExampleVibe[] = [
  {
    id: "customer-intake",
    name: "Customer intake",
    description: "Capture a request, branch on completeness, loop preferred times, and invoke booking.",
    tags: ["Operations", "Control Flow"],
    yaml: `workflow:
  id: customer-intake-starter
  name: Customer Intake
  description: |
    Captures customer service requests, extracts required intake details,
    routes incomplete requests for follow-up, scores preferred appointment
    windows, and starts a booking recommendation workflow.
  steps:
    - id: normalize_intake
      function: aiExtractVariables
      next_step_id: intake_quality_gate
      on_error_step_id: intake_failed
      input:
        text: "\${conversationContext}"
        variables_to_extract:
          - name: customer_name
            description: Full name of the customer requesting service.
            validation:
              required: true
          - name: email
            description: Customer email address for follow-up.
            validation:
              required: true
          - name: service_address
            description: Address where service is needed.
            validation:
              required: true
          - name: issue_summary
            description: Short summary of the service issue.
            validation:
              required: true
          - name: preferred_times
            description: Appointment windows the customer prefers.
            validation:
              required: false

    - id: intake_quality_gate
      function: handleConditional
      on_error_step_id: intake_failed
      input:
        condition:
          type: if
          condition:
            operator: exists
            left: "\${steps.normalize_intake.output.service_address}"
          then: create_customer_record
          else: request_missing_information

    - id: request_missing_information
      function: promptUser
      next_step_id: normalize_intake
      input:
        message: Please share your service address and a short description of the issue.
        response_type: text

    - id: create_customer_record
      function: apiRequest
      next_step_id: process_preferred_times
      on_error_step_id: intake_failed
      input:
        endpoint: "https://api.example.com/customers"
        method: POST
        body:
          type: json
          content:
            name: "\${steps.normalize_intake.output.customer_name}"
            email: "\${steps.normalize_intake.output.email}"
            address: "\${steps.normalize_intake.output.service_address}"
            issue_summary: "\${steps.normalize_intake.output.issue_summary}"

    - id: process_preferred_times
      function: loopFlow
      next_step_id: start_booking_workflow
      on_error_step_id: intake_failed
      input:
        iterable: "\${steps.normalize_intake.output.preferred_times}"
        steps:
          - id: score_time_window
            function: aiProcessing
            next_step_id: save_time_window
            input:
              output_type: json
              prompt: "Score this appointment window for dispatch fit: \${currentElement}"

          - id: save_time_window
            function: apiRequest
            input:
              endpoint: "https://api.example.com/availability"
              method: POST
              body:
                type: json
                content:
                  window: "\${currentElement}"
                  score: "\${currentElementSteps.score_time_window.output.score}"

    - id: start_booking_workflow
      function: invokeWorkflow
      next_step_id: send_confirmation
      on_error_step_id: intake_failed
      input:
        workflow_id: booking-recommendation
        payload:
          customer_id: "\${steps.create_customer_record.output.customer_id}"

    - id: send_confirmation
      function: sendResponse
      next_step_id: intake_done
      input:
        type: fixed
        message: We have your request and are reviewing appointment options.

    - id: intake_done
      function: concludeWorkflow
      input: {}

    - id: intake_failed
      function: concludeWorkflow
      input: {}

    - id: enrich_source_context
      function: aiProcessing
      next_step_id: enrichment_done
      input:
        output_type: json
        prompt: Summarize source quality for \${uniqueData.source}.

    - id: enrichment_done
      function: concludeWorkflow
      input: {}
`,
  },
  {
    id: "lead-qualification",
    name: "Lead qualification",
    description: "Score a lead, route qualified buyers, process objections, and hand off to sales.",
    tags: ["Sales", "Control Flow"],
    yaml: `workflow:
  id: lead-qualification-starter
  name: Lead Qualification
  description: |
    Scores inbound sales leads, routes qualified prospects to sales,
    processes stated objections, and sends nurture follow-up when the
    lead is not ready for handoff.
  steps:
    - id: capture_lead
      function: aiExtractVariables
      next_step_id: score_lead
      on_error_step_id: qualification_failed
      input:
        text: "\${conversationContext}"
        variables_to_extract:
          - name: name
            description: Lead name.
            validation:
              required: true
          - name: email
            description: Lead email address.
            validation:
              required: true
          - name: company
            description: Lead company or organization.
            validation:
              required: false
          - name: objections
            description: Buying objections or concerns the lead raised.
            validation:
              required: false

    - id: score_lead
      function: aiProcessing
      next_step_id: qualification_gate
      on_error_step_id: qualification_failed
      input:
        output_type: json
        prompt: "Score this lead from 0 to 100 and explain the score: \${steps.capture_lead.output}"

    - id: qualification_gate
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: gte
            left: "\${steps.score_lead.output.score}"
            right: 70
          then: inspect_objections
          else: nurture_lead

    - id: inspect_objections
      function: loopFlow
      next_step_id: start_sales_handoff
      on_error_step_id: qualification_failed
      input:
        iterable: "\${steps.capture_lead.output.objections}"
        steps:
          - id: classify_objection
            function: aiProcessing
            next_step_id: save_objection_note
            input:
              output_type: json
              prompt: "Classify this objection and suggest a response: \${currentElement}"

          - id: save_objection_note
            function: apiRequest
            input:
              endpoint: "https://api.example.com/leads/notes"
              method: POST
              body:
                type: json
                content:
                  lead_email: "\${steps.capture_lead.output.email}"
                  objection: "\${currentElement}"
                  classification: "\${currentElementSteps.classify_objection.output}"

    - id: start_sales_handoff
      function: invokeWorkflow
      next_step_id: send_qualified_reply
      on_error_step_id: qualification_failed
      input:
        workflow_id: sales-consultation-booking
        payload:
          lead: "\${steps.capture_lead.output}"

    - id: send_qualified_reply
      function: sendEmail
      next_step_id: qualified_done
      input:
        to_email: "\${steps.capture_lead.output.email}"
        subject: Next step for your consultation
        body: We can help. Here is the best next step.

    - id: qualified_done
      function: concludeWorkflow
      input: {}

    - id: nurture_lead
      function: sendEmail
      next_step_id: nurture_done
      input:
        to_email: "\${steps.capture_lead.output.email}"
        subject: Helpful resources
        body: Here are resources until the timing is better.

    - id: nurture_done
      function: concludeWorkflow
      input: {}

    - id: qualification_failed
      function: concludeWorkflow
      input: {}

    - id: research_company
      function: apiRequest
      next_step_id: research_done
      input:
        endpoint: "https://api.example.com/company-enrichment"
        method: POST
        body:
          type: json
          content:
            company: "\${steps.capture_lead.output.company}"

    - id: research_done
      function: concludeWorkflow
      input: {}
`,
  },
  {
    id: "estimate-follow-up",
    name: "Estimate follow-up",
    description: "Recommend an estimate option, loop value points, schedule a reminder, and close out.",
    tags: ["Sales", "Automation"],
    yaml: `workflow:
  id: estimate-follow-up-starter
  name: Estimate Follow-Up
  description: |
    Loads a customer estimate, recommends the next best offer, loops over
    value points for active options, and schedules a future follow-up check.
  steps:
    - id: load_estimate
      function: apiRequest
      next_step_id: create_followup_strategy
      on_error_step_id: followup_failed
      input:
        endpoint: "https://api.example.com/estimates/\${uniqueData.estimateId}"
        method: GET

    - id: create_followup_strategy
      function: aiProcessing
      next_step_id: recommendation_gate
      on_error_step_id: followup_failed
      input:
        output_type: json
        prompt: Recommend premium, standard, or defer for \${steps.load_estimate.output}.

    - id: recommendation_gate
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: ne
            left: "\${steps.create_followup_strategy.output.recommended_option}"
            right: defer
          then: prepare_option_loop
          else: send_defer_followup

    - id: prepare_option_loop
      function: loopFlow
      next_step_id: invoke_payment_or_booking
      on_error_step_id: followup_failed
      input:
        iterable: "\${steps.create_followup_strategy.output.options}"
        steps:
          - id: build_option_value
            function: aiProcessing
            next_step_id: save_option_summary
            input:
              output_type: json
              prompt: Create value points for \${currentElement}.

          - id: save_option_summary
            function: apiRequest
            input:
              endpoint: "https://api.example.com/option-summaries"
              method: POST
              body:
                type: json
                content:
                  option: "\${currentElement}"
                  value_points: "\${currentElementSteps.build_option_value.output}"

    - id: invoke_payment_or_booking
      function: invokeWorkflow
      next_step_id: send_recommended_followup
      input:
        workflow_id: booking-or-payment-link-generator
        payload:
          estimate_id: "\${uniqueData.estimateId}"

    - id: send_recommended_followup
      function: sendEmail
      next_step_id: followup_done
      input:
        to_email: "\${steps.load_estimate.output.customer.email}"
        subject: Recommended next step
        body: "Here is the recommended path: \${steps.invoke_payment_or_booking.output.link}"

    - id: send_defer_followup
      function: sendEmail
      next_step_id: followup_done
      input:
        to_email: "\${steps.load_estimate.output.customer.email}"
        subject: Keeping your estimate handy
        body: We will check back later.

    - id: followup_done
      function: concludeWorkflow
      input: {}

    - id: followup_failed
      function: concludeWorkflow
      input: {}

    - id: schedule_followup_reminder
      function: scheduleFlow
      next_step_id: reminder_done
      input:
        start_date_time: "\${uniqueData.followupDate}"
        start_date_time_format: "YYYY-MM-DD HH:mm"
        time_zone: America/Chicago
        is_recurring: false
        steps:
          - id: send_reminder
            function: sendEmail
            input:
              to_email: "\${steps.load_estimate.output.customer.email}"
              subject: Checking in on your estimate
              body: We are following up on your estimate.
            next_step_id: vibe_break

    - id: reminder_done
      function: concludeWorkflow
      input: {}
`,
  },
  {
    id: "support-escalation",
    name: "Support escalation",
    description: "Classify urgency, collect evidence in a loop, escalate, and monitor SLA.",
    tags: ["Support", "Error Handling"],
    yaml: `workflow:
  id: support-escalation-starter
  name: Support Escalation
  description: |
    Classifies support urgency, collects requested evidence for critical
    cases, escalates to a manager handoff workflow, and schedules SLA monitoring.
  steps:
    - id: classify_support_case
      function: aiProcessing
      next_step_id: escalation_gate
      on_error_step_id: escalation_failed
      input:
        output_type: json
        prompt: Classify urgency, sentiment, and evidence needed for \${uniqueData.message}.

    - id: escalation_gate
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: eq
            left: "\${steps.classify_support_case.output.urgency}"
            right: critical
          then: collect_evidence
          else: standard_support_reply

    - id: collect_evidence
      function: loopFlow
      next_step_id: invoke_escalation_subflow
      on_error_step_id: escalation_failed
      input:
        iterable: "\${steps.classify_support_case.output.evidence_needed}"
        steps:
          - id: request_evidence_item
            function: promptUser
            next_step_id: store_evidence_request
            input:
              message: "Please provide this item: \${currentElement}"
              response_type: text

          - id: store_evidence_request
            function: apiRequest
            input:
              endpoint: "https://api.example.com/support/evidence"
              method: POST
              body:
                type: json
                content:
                  case_id: "\${uniqueData.caseId}"
                  requested_item: "\${currentElement}"

    - id: invoke_escalation_subflow
      function: invokeWorkflow
      next_step_id: send_escalation_ack
      on_error_step_id: escalation_failed
      input:
        workflow_id: manager-escalation-handoff
        payload:
          case_id: "\${uniqueData.caseId}"

    - id: send_escalation_ack
      function: sendResponse
      next_step_id: escalation_done
      input:
        type: fixed
        message: We escalated this to the right team.

    - id: standard_support_reply
      function: sendResponse
      next_step_id: escalation_done
      input:
        type: dynamic
        message: "Support has the right context: \${steps.classify_support_case.output.summary}"

    - id: escalation_done
      function: concludeWorkflow
      input: {}

    - id: escalation_failed
      function: concludeWorkflow
      input: {}

    - id: calculate_sla_deadline
      function: aiProcessing
      next_step_id: schedule_sla_check
      input:
        output_type: json
        prompt: Calculate the SLA deadline for \${uniqueData.caseId}.

    - id: schedule_sla_check
      function: scheduleFlow
      next_step_id: sla_monitor_done
      input:
        start_date_time: "\${steps.calculate_sla_deadline.output.deadline}"
        start_date_time_format: "YYYY-MM-DD HH:mm"
        time_zone: America/Chicago
        is_recurring: false
        steps:
          - id: run_sla_check
            function: invokeWorkflow
            input:
              workflow_id: support-sla-check
              payload:
                case_id: "\${uniqueData.caseId}"
            next_step_id: vibe_break

    - id: sla_monitor_done
      function: concludeWorkflow
      input: {}
`,
  },
  {
    id: "conditional-branch-demo",
    name: "Conditional branch demo",
    description: "A compact branch-heavy Vibe with nested then/else routing and terminal outcomes.",
    tags: ["Control Flow"],
    yaml: `workflow:
  id: conditional-branch-demo
  name: Conditional Branch Demo
  description: |
    Demonstrates nested conditionals, looped technical tasks, workflow
    invocation, and separate terminal outcomes for branch-heavy workflows.
  steps:
    - id: inspect_request
      function: aiProcessing
      next_step_id: first_branch
      on_error_step_id: branch_failed
      input:
        output_type: json
        prompt: Return type, priority, and tasks for \${uniqueData.message}.

    - id: first_branch
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: eq
            left: "\${steps.inspect_request.output.type}"
            right: technical
          then: technical_priority_branch
          else: non_technical_branch

    - id: technical_priority_branch
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: eq
            left: "\${steps.inspect_request.output.priority}"
            right: high
          then: run_technical_task_loop
          else: send_standard_technical_reply

    - id: run_technical_task_loop
      function: loopFlow
      next_step_id: invoke_technical_handoff
      on_error_step_id: branch_failed
      input:
        iterable: "\${steps.inspect_request.output.tasks}"
        steps:
          - id: summarize_task
            function: aiProcessing
            next_step_id: create_task_ticket
            input:
              output_type: json
              prompt: Summarize \${currentElement}.

          - id: create_task_ticket
            function: apiRequest
            input:
              endpoint: "https://api.example.com/tasks"
              method: POST
              body:
                type: json
                content:
                  task: "\${currentElement}"
                  summary: "\${currentElementSteps.summarize_task.output}"

    - id: invoke_technical_handoff
      function: invokeWorkflow
      next_step_id: send_escalated_technical_reply
      input:
        workflow_id: technical-escalation
        payload:
          request: "\${steps.inspect_request.output}"

    - id: send_escalated_technical_reply
      function: sendResponse
      next_step_id: branch_done
      input:
        type: fixed
        message: Your technical request has been escalated.

    - id: send_standard_technical_reply
      function: sendResponse
      next_step_id: branch_done
      input:
        type: fixed
        message: Your technical request has been sent to support.

    - id: non_technical_branch
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: eq
            left: "\${steps.inspect_request.output.type}"
            right: sales
          then: send_sales_reply
          else: send_billing_reply

    - id: send_sales_reply
      function: sendEmail
      next_step_id: branch_done
      input:
        to_email: "\${uniqueData.email}"
        subject: Next step with sales
        body: Sales will help with the next option.

    - id: send_billing_reply
      function: sendEmail
      next_step_id: branch_done
      input:
        to_email: "\${uniqueData.email}"
        subject: Billing support next step
        body: Billing will review this.

    - id: branch_done
      function: concludeWorkflow
      input: {}

    - id: branch_failed
      function: concludeWorkflow
      input: {}
`,
  },
  {
    id: "loop-and-parallel-demo",
    name: "Loop and parallel demo",
    description: "Three parallel lanes with a batch loop, quality report, schedule step, and completion states.",
    tags: ["Parallel", "Loops"],
    yaml: `workflow:
  id: loop-and-parallel-demo
  name: Loop and Parallel Demo
  description: |
    Demonstrates a batch-processing lane, a quality-report lane, and a
    scheduled completion-check lane using API-standard loop and schedule shapes.
  steps:
    - id: parse_batch
      function: extractDataFromSheet
      next_step_id: batch_size_gate
      on_error_step_id: batch_failed
      input:
        query_string: Extract each customer row with email, order total, and status.
        file_buffer: "\${file-buffer:uniqueData.uploadedFile}"
        file_name: "\${uniqueData.uploadedFileName}"

    - id: batch_size_gate
      function: handleConditional
      input:
        condition:
          type: if
          condition:
            operator: gt
            left: "\${steps.parse_batch.output.recordCount}"
            right: 0
          then: process_each_row
          else: empty_batch_done

    - id: process_each_row
      function: loopFlow
      next_step_id: invoke_batch_summary
      on_error_step_id: batch_failed
      input:
        iterable: "\${steps.parse_batch.output.data}"
        steps:
          - id: classify_row
            function: aiProcessing
            next_step_id: write_row_result
            input:
              output_type: json
              prompt: "Classify this row: \${currentElement}"

          - id: write_row_result
            function: apiRequest
            input:
              endpoint: "https://api.example.com/batch-results"
              method: POST
              body:
                type: json
                content:
                  row: "\${currentElement}"
                  classification: "\${currentElementSteps.classify_row.output}"

    - id: invoke_batch_summary
      function: invokeWorkflow
      next_step_id: batch_done
      input:
        workflow_id: batch-summary-generator
        payload:
          row_count: "\${steps.parse_batch.output.recordCount}"

    - id: batch_done
      function: concludeWorkflow
      input: {}

    - id: empty_batch_done
      function: concludeWorkflow
      input: {}

    - id: batch_failed
      function: concludeWorkflow
      input: {}

    - id: profile_uploaded_file
      function: aiProcessing
      next_step_id: create_quality_report
      input:
        output_type: json
        prompt: Profile file quality for \${uniqueData.uploadedFileName}.

    - id: create_quality_report
      function: createHtmlTable
      next_step_id: quality_report_done
      input:
        data: "\${steps.profile_uploaded_file.output}"

    - id: quality_report_done
      function: concludeWorkflow
      input: {}

    - id: schedule_completion_check
      function: scheduleFlow
      next_step_id: notify_lane_done
      input:
        start_date_time: "\${system.timestamp_plus_15_minutes}"
        start_date_time_format: "YYYY-MM-DD HH:mm"
        time_zone: America/Chicago
        is_recurring: false
        steps:
          - id: check_batch_completion
            function: invokeWorkflow
            input:
              workflow_id: batch-completion-check
              payload:
                file_name: "\${uniqueData.uploadedFileName}"
            next_step_id: vibe_break

    - id: notify_lane_done
      function: concludeWorkflow
      input: {}
`,
  },
];

export const defaultExampleVibe = exampleVibes[0];
