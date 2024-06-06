require 'net/http'
require 'uri'

class ArticlesController < ApplicationController
  def index
    articles = Article.all
    props = { :articles => articles, :view => "articles/index" }

    render json: props
  end

  def show
    article = Article.find(params[:id])
    props = {
      :title => article.title,
      :body => article.body,
      :view => "articles/show"
    }

    render json: props
  end
end
