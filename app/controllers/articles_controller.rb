require 'net/http'
require 'uri'

class ArticlesController < ApplicationController
  def index
    articles = Article.all
    props = { :articles => articles }
    view = "articles/index"
    uri = URI.parse("http://localhost:4321?props=#{props.to_json}&view=#{view}")
    res = Net::HTTP.get_response uri

    puts res.body

    render html: res.body.html_safe
  end

  def show
    article = Article.find(params[:id])
    props = article
    view = "articles/show"

    uri = URI.parse("http://localhost:4321?props=#{props.to_json}&view=#{view}")
    res = Net::HTTP.get_response uri

    render html: res.body.html_safe
  end
end
