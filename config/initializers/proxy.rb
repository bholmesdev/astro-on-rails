require 'rack/proxy'

ENV['ASTRO_DEV_URL'] ||= 'http://localhost:4321'

class RackAstroProxy < Rack::Proxy
  def initialize(app)
    @app = app
  end

  def call(env)
    original_host = env["HTTP_HOST"]
    rewrite_env(env)
    if env["HTTP_HOST"] != original_host
      perform_request(env)
    else
      # just regular
      @app.call(env)
    end
  end

  def rewrite_env(env)
    request = Rack::Request.new(env)
    if request.path =~ %r{^/articles|^/other_prefix}
      # do nothing
    else
      env["HTTP_HOST"] = "localhost:4321"
    end
    env
  end
end
