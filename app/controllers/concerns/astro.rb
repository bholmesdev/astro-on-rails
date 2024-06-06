module Astro
  extend ActiveSupport::Concern

  included do
    rescue_from(ActionController::MissingExactTemplate) do |_exception|
      action = instance_variable_get(:@_action_name)
      # Get instance variables that are not part of the controller's state
      props = instance_variables.select { |v| !v.to_s.start_with?('@_') && v.to_s != '@rendered_format' && v.to_s != '@marked_for_same_origin_verification' }
      # Remove leading '@' from instance variable names
      props = props.map { |v| [v.to_s[1..-1], instance_variable_get(v)] }.to_h

      response.headers['X-Astro-View'] = "#{self.controller_name}/#{action}"
      render json: props
    end
  end

  class_methods do

  end

end
