require 'net/http'
require 'uri'

class ArticlesController < ApplicationController
  def index
    props = { :message => "Welcome to Rails, Astro" }
    view = "message"
    uri = URI.parse("http://localhost:4321?props=#{props.to_json}&view=#{view}")
    res = Net::HTTP.get_response uri

    render html: res.body.html_safe
  end

  def show
    # context = MiniRacer::Context.new
    # context.load("/Users/benholmes/Sandbox/rails-blog/app/controllers/test.mjs")
    # puts context.call("adder", 1, 2)

    @article = Article.find(params[:id])
  end
end
