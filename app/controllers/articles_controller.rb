require 'net/http'
require 'uri'

class ArticlesController < ApplicationController
  def index
    articles = Article.all
    props = { :articles => articles }

    response.headers['X-Astro-View'] = "articles/index"
    render json: props
  end

  def show
    article = Article.find(params[:id])
    props = {
      :title => article.title,
      :body => article.body
    }

    response.headers['X-Astro-View'] = "articles/show"
    render json: props
  end
end
