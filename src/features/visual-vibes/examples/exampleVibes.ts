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
  description: Customer request intake with branching, loops, workflow invocation, and error handling.
  steps:
    - id: normalize_intake
      function: aiExtractVariables
      next_step_id: intake_quality_gate
      on_error_step_id: intake_failed
      input:
        text: \${uniqueData.message}
        output_type: json
        variables:
          - customer_name
          - email
          - service_address
          - issue_summary
          - preferred_times

    - id: intake_quality_gate
      function: handleConditional
      on_error_step_id: intake_failed
      input:
        condition:
          expression: \${steps.normalize_intake.output.service_address != null}
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
        endpoint: https://api.example.com/customers
        method: POST
        body:
          name: \${steps.normalize_intake.output.customer_name}
          address: \${steps.normalize_intake.output.service_address}

    - id: process_preferred_times
      function: loopFlow
      next_step_id: start_booking_workflow
      on_error_step_id: intake_failed
      input:
        items: \${steps.normalize_intake.output.preferred_times}
        item_variable: preferredTime
        steps:
          - score_time_window
          - save_time_window

    - id: score_time_window
      function: aiProcessing
      next_step_id: save_time_window
      input:
        output_type: json
        prompt: "Score this appointment window for dispatch fit: \${preferredTime}"

    - id: save_time_window
      function: apiRequest
      input:
        endpoint: https://api.example.com/availability
        method: POST
        body:
          window: \${preferredTime}
          score: \${steps.score_time_window.output.score}

    - id: start_booking_workflow
      function: invokeWorkflow
      next_step_id: send_confirmation
      on_error_step_id: intake_failed
      input:
        workflow_id: booking-recommendation
        payload:
          customer_id: \${steps.create_customer_record.output.customer_id}

    - id: send_confirmation
      function: sendResponse
      next_step_id: intake_done
      input:
        type: dynamic
        channel: \${uniqueData.source}
        message: We have your request and are reviewing appointment options.

    - id: intake_done
      function: concludeWorkflow
      input:
        status: completed

    - id: intake_failed
      function: concludeWorkflow
      input:
        status: failed
        reason: \${system.error.message}

    - id: enrich_source_context
      function: aiProcessing
      next_step_id: enrichment_done
      input:
        output_type: json
        prompt: Summarize source quality for \${uniqueData.source}.

    - id: enrichment_done
      function: concludeWorkflow
      input:
        status: enrichment_complete
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
  description: Lead scoring flow with conditionals, loops, workflow invocation, and a parallel research lane.
  steps:
    - id: capture_lead
      function: aiExtractVariables
      next_step_id: score_lead
      on_error_step_id: qualification_failed
      input:
        text: \${uniqueData.transcript}
        output_type: json
        variables:
          - name
          - email
          - company
          - objections

    - id: score_lead
      function: aiProcessing
      next_step_id: qualification_gate
      on_error_step_id: qualification_failed
      input:
        output_type: json
        prompt: "Score this lead from 0 to 100: \${steps.capture_lead.output}"

    - id: qualification_gate
      function: handleConditional
      input:
        condition:
          expression: \${steps.score_lead.output.score >= 70}
          then: inspect_objections
          else: nurture_lead

    - id: inspect_objections
      function: loopFlow
      next_step_id: start_sales_handoff
      on_error_step_id: qualification_failed
      input:
        items: \${steps.capture_lead.output.objections}
        item_variable: objection
        steps:
          - classify_objection
          - save_objection_note

    - id: classify_objection
      function: aiProcessing
      next_step_id: save_objection_note
      input:
        output_type: json
        prompt: "Classify this objection: \${objection}"

    - id: save_objection_note
      function: apiRequest
      input:
        endpoint: https://api.example.com/leads/notes
        method: POST
        body:
          objection: \${objection}
          classification: \${steps.classify_objection.output}

    - id: start_sales_handoff
      function: invokeWorkflow
      next_step_id: send_qualified_reply
      on_error_step_id: qualification_failed
      input:
        workflow_id: sales-consultation-booking
        payload:
          lead: \${steps.capture_lead.output}

    - id: send_qualified_reply
      function: sendEmail
      next_step_id: qualified_done
      input:
        to: \${steps.capture_lead.output.email}
        subject: Next step for your consultation
        body: We can help. Here is the best next step.

    - id: qualified_done
      function: concludeWorkflow
      input:
        status: qualified

    - id: nurture_lead
      function: sendEmail
      next_step_id: nurture_done
      input:
        to: \${steps.capture_lead.output.email}
        subject: Helpful resources
        body: Here are resources until the timing is better.

    - id: nurture_done
      function: concludeWorkflow
      input:
        status: nurture

    - id: qualification_failed
      function: concludeWorkflow
      input:
        status: failed
        reason: \${system.error.message}

    - id: research_company
      function: apiRequest
      next_step_id: research_done
      input:
        endpoint: https://api.example.com/company-enrichment
        method: POST
        body:
          company: \${steps.capture_lead.output.company}

    - id: research_done
      function: concludeWorkflow
      input:
        status: research_complete
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
  description: Estimate follow-up with recommendation routing, looped options, and reminder scheduling.
  steps:
    - id: load_estimate
      function: apiRequest
      next_step_id: create_followup_strategy
      on_error_step_id: followup_failed
      input:
        endpoint: https://api.example.com/estimates/\${uniqueData.estimateId}
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
          expression: \${steps.create_followup_strategy.output.recommended_option != "defer"}
          then: prepare_option_loop
          else: send_defer_followup

    - id: prepare_option_loop
      function: loopFlow
      next_step_id: invoke_payment_or_booking
      on_error_step_id: followup_failed
      input:
        items: \${steps.create_followup_strategy.output.options}
        item_variable: estimateOption
        steps:
          - build_option_value
          - save_option_summary

    - id: build_option_value
      function: aiProcessing
      next_step_id: save_option_summary
      input:
        output_type: json
        prompt: Create value points for \${estimateOption}.

    - id: save_option_summary
      function: apiRequest
      input:
        endpoint: https://api.example.com/option-summaries
        method: POST
        body:
          option: \${estimateOption}

    - id: invoke_payment_or_booking
      function: invokeWorkflow
      next_step_id: send_recommended_followup
      input:
        workflow_id: booking-or-payment-link-generator
        payload:
          estimate_id: \${uniqueData.estimateId}

    - id: send_recommended_followup
      function: sendEmail
      next_step_id: followup_done
      input:
        to: \${steps.load_estimate.output.customer.email}
        subject: Recommended next step
        body: "Here is the recommended path: \${steps.invoke_payment_or_booking.output.link}"

    - id: send_defer_followup
      function: sendEmail
      next_step_id: followup_done
      input:
        to: \${steps.load_estimate.output.customer.email}
        subject: Keeping your estimate handy
        body: We will check back later.

    - id: followup_done
      function: concludeWorkflow
      input:
        status: completed

    - id: followup_failed
      function: concludeWorkflow
      input:
        status: failed
        reason: \${system.error.message}

    - id: schedule_followup_reminder
      function: scheduleFlow
      next_step_id: reminder_done
      input:
        workflow_id: estimate-follow-up-starter
        start_datetime: \${uniqueData.followupDate}
        timezone: America/Chicago

    - id: reminder_done
      function: concludeWorkflow
      input:
        status: reminder_scheduled
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
  description: Support flow with escalation routing, evidence collection, subworkflow handoff, and SLA monitoring.
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
          expression: \${steps.classify_support_case.output.urgency == "critical"}
          then: collect_evidence
          else: standard_support_reply

    - id: collect_evidence
      function: loopFlow
      next_step_id: invoke_escalation_subflow
      on_error_step_id: escalation_failed
      input:
        items: \${steps.classify_support_case.output.evidence_needed}
        item_variable: evidenceItem
        steps:
          - request_evidence_item
          - store_evidence_request

    - id: request_evidence_item
      function: promptUser
      next_step_id: store_evidence_request
      input:
        message: "Please provide this item: \${evidenceItem}"
        response_type: text

    - id: store_evidence_request
      function: apiRequest
      input:
        endpoint: https://api.example.com/support/evidence
        method: POST
        body:
          requested_item: \${evidenceItem}

    - id: invoke_escalation_subflow
      function: invokeWorkflow
      next_step_id: send_escalation_ack
      on_error_step_id: escalation_failed
      input:
        workflow_id: manager-escalation-handoff
        payload:
          case_id: \${uniqueData.caseId}

    - id: send_escalation_ack
      function: sendResponse
      next_step_id: escalation_done
      input:
        type: fixed
        channel: \${uniqueData.source}
        message: We escalated this to the right team.

    - id: standard_support_reply
      function: sendResponse
      next_step_id: escalation_done
      input:
        type: dynamic
        channel: \${uniqueData.source}
        message: "Support has the right context: \${steps.classify_support_case.output.summary}"

    - id: escalation_done
      function: concludeWorkflow
      input:
        status: completed

    - id: escalation_failed
      function: concludeWorkflow
      input:
        status: failed
        reason: \${system.error.message}

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
        workflow_id: support-sla-check
        start_datetime: \${steps.calculate_sla_deadline.output.deadline}
        timezone: America/Chicago

    - id: sla_monitor_done
      function: concludeWorkflow
      input:
        status: sla_monitor_scheduled
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
  description: Branch-heavy demo with nested conditionals, looped technical tasks, and audit output.
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
          expression: \${steps.inspect_request.output.type == "technical"}
          then: technical_priority_branch
          else: non_technical_branch

    - id: technical_priority_branch
      function: handleConditional
      input:
        condition:
          expression: \${steps.inspect_request.output.priority == "high"}
          then: run_technical_task_loop
          else: send_standard_technical_reply

    - id: run_technical_task_loop
      function: loopFlow
      next_step_id: invoke_technical_handoff
      on_error_step_id: branch_failed
      input:
        items: \${steps.inspect_request.output.tasks}
        item_variable: task
        steps:
          - summarize_task
          - create_task_ticket

    - id: summarize_task
      function: aiProcessing
      next_step_id: create_task_ticket
      input:
        output_type: json
        prompt: Summarize \${task}.

    - id: create_task_ticket
      function: apiRequest
      input:
        endpoint: https://api.example.com/tasks
        method: POST
        body:
          task: \${task}

    - id: invoke_technical_handoff
      function: invokeWorkflow
      next_step_id: send_escalated_technical_reply
      input:
        workflow_id: technical-escalation
        payload:
          request: \${steps.inspect_request.output}

    - id: send_escalated_technical_reply
      function: sendResponse
      next_step_id: branch_done
      input:
        type: fixed
        channel: \${uniqueData.source}
        message: Your technical request has been escalated.

    - id: send_standard_technical_reply
      function: sendResponse
      next_step_id: branch_done
      input:
        type: fixed
        channel: \${uniqueData.source}
        message: Your technical request has been sent to support.

    - id: non_technical_branch
      function: handleConditional
      input:
        condition:
          expression: \${steps.inspect_request.output.type == "sales"}
          then: send_sales_reply
          else: send_billing_reply

    - id: send_sales_reply
      function: sendEmail
      next_step_id: branch_done
      input:
        to: \${uniqueData.email}
        subject: Next step with sales
        body: Sales will help with the next option.

    - id: send_billing_reply
      function: sendEmail
      next_step_id: branch_done
      input:
        to: \${uniqueData.email}
        subject: Billing support next step
        body: Billing will review this.

    - id: branch_done
      function: concludeWorkflow
      input:
        status: completed

    - id: branch_failed
      function: concludeWorkflow
      input:
        status: failed
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
  description: Loop and parallel path demo with a batch processor, quality report, and scheduled notification lane.
  steps:
    - id: parse_batch
      function: extractDataFromSheet
      next_step_id: batch_size_gate
      on_error_step_id: batch_failed
      input:
        filename: \${uniqueData.uploadedFile}
        return_format: json

    - id: batch_size_gate
      function: handleConditional
      input:
        condition:
          expression: \${steps.parse_batch.output.rows.length > 0}
          then: process_each_row
          else: empty_batch_done

    - id: process_each_row
      function: loopFlow
      next_step_id: invoke_batch_summary
      on_error_step_id: batch_failed
      input:
        items: \${steps.parse_batch.output.rows}
        item_variable: row
        steps:
          - classify_row
          - write_row_result

    - id: classify_row
      function: aiProcessing
      next_step_id: write_row_result
      input:
        output_type: json
        prompt: "Classify this row: \${row}"

    - id: write_row_result
      function: apiRequest
      input:
        endpoint: https://api.example.com/batch-results
        method: POST
        body:
          row: \${row}
          classification: \${steps.classify_row.output}

    - id: invoke_batch_summary
      function: invokeWorkflow
      next_step_id: batch_done
      input:
        workflow_id: batch-summary-generator
        payload:
          row_count: \${steps.parse_batch.output.rows.length}

    - id: batch_done
      function: concludeWorkflow
      input:
        status: completed

    - id: empty_batch_done
      function: concludeWorkflow
      input:
        status: empty_batch

    - id: batch_failed
      function: concludeWorkflow
      input:
        status: failed

    - id: profile_uploaded_file
      function: aiProcessing
      next_step_id: create_quality_report
      input:
        output_type: json
        prompt: Profile file quality for \${uniqueData.uploadedFile}.

    - id: create_quality_report
      function: createHtmlTable
      next_step_id: quality_report_done
      input:
        data: \${steps.profile_uploaded_file.output}

    - id: quality_report_done
      function: concludeWorkflow
      input:
        status: quality_report_complete

    - id: schedule_completion_check
      function: scheduleFlow
      next_step_id: notify_lane_done
      input:
        workflow_id: batch-completion-check
        start_datetime: \${system.timestamp_plus_15_minutes}
        timezone: America/Chicago

    - id: notify_lane_done
      function: concludeWorkflow
      input:
        status: completion_check_scheduled
`,
  },
];

export const defaultExampleVibe = exampleVibes[0];
