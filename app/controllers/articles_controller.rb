require 'net/http'
require 'uri'

class ArticlesController < ApplicationController
  include Astro
  def index
    @articles = Article.all
  end

  def show
    article = Article.find(params[:id])
    @title = article.title
    @body = article.body
  end
end
